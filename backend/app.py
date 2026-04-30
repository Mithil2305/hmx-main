
import os
# Load .env FIRST before any other imports that read env vars
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from flask import Flask, request, jsonify, make_response
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
import sqlite3
import logging

# OTP log file
_otp_logger = logging.getLogger('otp')
_otp_logger.setLevel(logging.INFO)
_otp_handler = logging.FileHandler(os.path.join(os.path.dirname(__file__), 'otp.log'))
_otp_handler.setFormatter(logging.Formatter('%(asctime)s  %(message)s'))
_otp_logger.addHandler(_otp_handler)
from routes.businessBooking import init_business_booking_routes
from routes.payment_routes import init_payment_routes
from utils.state_machine import can_transition, normalize_booking_status, BOOKING_STATUSES, normalize_payment_status
from services.booking_service import (
    BookingLifecycleError,
    append_edited_version,
    append_revision_history,
    get_actor_id,
    set_auto_approval_deadline,
    transition_booking,
    update_booking_status,
)
from services.payment_service import distribute_payment, PaymentDistributionError
from services.notification_service import emit_booking_notification
import jwt
from datetime import datetime, timedelta

# Earnings calculation constants
EARNINGS_PERCENTAGES = {
    'pilot': 0.65,      # 65%
    'editor': 0.10,     # 10%
    'referral': 0.10,   # 10%
    'hmx': 0.15,        # 15%
}

def calculate_earnings(total_amount, user_type):
    """Calculate earnings for different user types"""
    if user_type not in EARNINGS_PERCENTAGES:
        return 0
    return round(total_amount * EARNINGS_PERCENTAGES[user_type], 2)
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import hashlib
import random
import string
import werkzeug
from phonepe_payment import phonepe
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading
import json
import random
import string
from datetime import datetime, timedelta

print("✅ Environment variables loaded from .env file")

app = Flask(__name__)

# Manual CORS implementation to guarantee headers on all responses (including errors)
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        res = make_response()
        res.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
        res.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        res.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        res.headers.add("Access-Control-Allow-Credentials", "true")
        return res

@app.after_request
def add_cors_headers(response):
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
    response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    response.headers.add("Access-Control-Allow-Credentials", "true")
    return response

socketio = SocketIO(
    app,
    cors_allowed_origins=['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
    async_mode='threading'
)

active_connections = {}

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-here'  # Change this in production
DATABASE = 'hmx.db'  # Changed from 'backend/hmx.db' to just 'hmx.db'

# Email Configuration
EMAIL_CONFIG = {
    'SMTP_SERVER': os.getenv('SMTP_SERVER'),  # No default
    'SMTP_PORT': int(os.getenv('SMTP_PORT', '587')),  # Port can have default
    'EMAIL_ADDRESS': os.getenv('EMAIL_ADDRESS'),
    'EMAIL_PASSWORD': os.getenv('EMAIL_PASSWORD'),  # Must be set in env
    'USE_TLS': os.getenv('USE_TLS', 'true').lower() == 'true'
}

# Debug email configuration
print("📧 Email Configuration:")
print(f"   SMTP Server: {EMAIL_CONFIG['SMTP_SERVER']}")
print(f"   SMTP Port: {EMAIL_CONFIG['SMTP_PORT']}")
print(f"   Email Address: {EMAIL_CONFIG['EMAIL_ADDRESS']}")
print(f"   Password Set: {'Yes' if EMAIL_CONFIG['EMAIL_PASSWORD'] else 'No'}")
print(f"   Use TLS: {EMAIL_CONFIG['USE_TLS']}")
print()

CITY_LIST = [
    'Mumbai',
    'Pune',
    'Delhi',
    'Bangalore',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Ahmedabad',
    'Jaipur',
    'Chandigarh',
    'Lucknow'
]

def get_cors_origin():
    """Get the correct CORS origin based on the request"""
    origin = request.headers.get('Origin')
    if origin in ['http://localhost:5173', 'http://localhost:5174']:
        return origin
    return 'http://localhost:5173'  # fallback


def fetch_user_from_token(token_value):
    """Decode JWT token and fetch associated user data"""
    if not token_value:
        raise ValueError('Token is missing')

    token_value = token_value.strip()
    if token_value.startswith('Bearer '):
        token_value = token_value.split(' ')[1]

    decoded_token = jwt.decode(token_value, app.config['SECRET_KEY'], algorithms=['HS256'])
    role = decoded_token.get('role')
    user_id = decoded_token.get('user_id')

    if not role or not user_id:
        raise ValueError('Invalid token data')

    conn = get_db()
    cursor = conn.cursor()

    if role == 'pilot':
        cursor.execute('SELECT * FROM pilots WHERE id = ?', (user_id,))
    elif role == 'editor':
        cursor.execute('SELECT * FROM editors WHERE id = ?', (user_id,))
    elif role == 'referral':
        cursor.execute('SELECT * FROM referrals WHERE id = ?', (user_id,))
    else:
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))

    user = cursor.fetchone()
    conn.close()

    if not user:
        raise ValueError('User not found')

    user_data = dict(user)
    user_data['role'] = role
    user_data['user_id'] = user_id
    return user_data


def get_user_room(role, user_id):
    return f"user_{role}_{user_id}"


def serialize_message(row):
    if not row:
        return None
    return {
        'id': row['id'],
        'sender_id': row['sender_id'],
        'sender_role': row['sender_role'],
        'receiver_id': row['receiver_id'],
        'receiver_role': row['receiver_role'],
        'content': row['content'],
        'status': row['status'],
        'created_at': row['created_at'],
        'read_at': row['read_at']
    }


def emit_message_events(message):
    if not message:
        return
    receiver_room = get_user_room(message['receiver_role'], message['receiver_id'])
    sender_room = get_user_room(message['sender_role'], message['sender_id'])
    socketio.emit('message:new', message, room=receiver_room)
    socketio.emit('message:sent', message, room=sender_room)


@socketio.on('connect')
def handle_connect(auth):
    token = None
    if isinstance(auth, dict):
        token = auth.get('token')
    if not token:
        token = request.args.get('token') or request.headers.get('Authorization')

    try:
        user = fetch_user_from_token(token)
        room = get_user_room(user['role'], user['user_id'])
        join_room(room)
        active_connections[request.sid] = {
            'room': room,
            'user': user
        }
        emit('connection:ready', {
            'user': {
                'id': user['user_id'],
                'role': user['role']
            }
        })
        print(f"Socket connected: {user['role']} #{user['user_id']} -> room {room}")
    except Exception as e:
        print(f"Socket authentication failed: {str(e)}")
        return False


@socketio.on('disconnect')
def handle_disconnect():
    conn = active_connections.pop(request.sid, None)
    if conn:
        leave_room(conn['room'])
        print(f"Socket disconnected: {conn['user']['role']} #{conn['user']['user_id']}")


@socketio.on('join:conversation')
def handle_join_conversation(data):
    conn = active_connections.get(request.sid)
    if not conn:
        disconnect()
        return

    target_role = data.get('role')
    target_id = data.get('id')
    if not target_role or not target_id:
        return

    room = get_user_room(target_role, target_id)
    join_room(room)
    emit('conversation:joined', {'room': room})

# Email sending functions
def send_email_async(to_email, subject, body, is_html=False):
    """Send email asynchronously to avoid blocking the main thread"""
    def send_email():
        try:
            send_email_sync(to_email, subject, body, is_html)
        except Exception as e:
            print(f"Failed to send email to {to_email}: {str(e)}")

    thread = threading.Thread(target=send_email)
    thread.daemon = True
    thread.start()
    
    
def send_email_with_template_helper(to_email, template_name, variables):
    """Fetch template, replace variables, and send email"""
    conn = sqlite3.connect("hmx.db")
    c = conn.cursor()
    c.execute("SELECT subject, body FROM email_templates WHERE name=?", (template_name,))
    row = c.fetchone()
    conn.close()

    if not row:
        print(f"❌ Template {template_name} not found in DB")
        return False

    subject, body = row
    for key, value in variables.items():
        subject = subject.replace(f"{{{{{key}}}}}", str(value))
        body = body.replace(f"{{{{{key}}}}}", str(value))

    return send_email_sync(to_email, subject, body, is_html=True)


def get_application_approval_email(applicant_name, application_type_label, admin_comments=''):
    """Return subject and body for an approval email. Use DB template if present."""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("SELECT subject, body FROM email_templates WHERE name = ?", ('application_approval',))
        row = c.fetchone()
        conn.close()
        if row:
            subject, body = row
            subject = subject.replace('{{name}}', applicant_name).replace('{{type}}', application_type_label)
            body = body.replace('{{name}}', applicant_name).replace('{{type}}', application_type_label).replace('{{comments}}', admin_comments)
            return subject, body
    except Exception as e:
        print(f"Error loading approval template: {e}")

    # Fallback
    subject = f"Your {application_type_label} application has been approved"
    body = f"Hi {applicant_name},\n\nYour {application_type_label} application has been approved by our team. {admin_comments}\n\nThanks,\nHMX Team"
    return subject, body


def get_application_rejection_email(applicant_name, application_type_label, admin_comments=''):
    """Return subject and body for a rejection email. Use DB template if present."""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("SELECT subject, body FROM email_templates WHERE name = ?", ('application_rejection',))
        row = c.fetchone()
        conn.close()
        if row:
            subject, body = row
            subject = subject.replace('{{name}}', applicant_name).replace('{{type}}', application_type_label)
            body = body.replace('{{name}}', applicant_name).replace('{{type}}', application_type_label).replace('{{comments}}', admin_comments)
            return subject, body
    except Exception as e:
        print(f"Error loading rejection template: {e}")

    # Fallback
    subject = f"Your {application_type_label} application has been rejected"
    body = f"Hi {applicant_name},\n\nWe reviewed your {application_type_label} application and, unfortunately, it was not approved. {admin_comments}\n\nRegards,\nHMX Team"
    return subject, body


def generate_random_password(length=10):
    """Generate a random password with letters and digits"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def send_email_sync(to_email, subject, body, is_html=False):
    """Send email synchronously"""
    try:
        print(f"📧 Attempting to send email to: {to_email}")
        print(f"📧 Using SMTP: {EMAIL_CONFIG['SMTP_SERVER']}:{EMAIL_CONFIG['SMTP_PORT']}")
        print(f"📧 From: {EMAIL_CONFIG['EMAIL_ADDRESS']}")
        print(f"📧 Password configured: {'Yes' if EMAIL_CONFIG['EMAIL_PASSWORD'] else 'No'}")

        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_CONFIG['EMAIL_ADDRESS']
        msg['To'] = to_email
        msg['Subject'] = subject

        # Add body to email
        if is_html:
            msg.attach(MIMEText(body, 'html'))
        else:
            msg.attach(MIMEText(body, 'plain'))

        print("📧 Connecting to SMTP server...")
        # Create SMTP session
        port = int(EMAIL_CONFIG['SMTP_PORT'])
        if port == 465:
            print("📧 Using SMTP_SSL on port 465...")
            server = smtplib.SMTP_SSL(EMAIL_CONFIG['SMTP_SERVER'], port)
        else:
            print(f"📧 Using standard SMTP on port {port}...")
            server = smtplib.SMTP(EMAIL_CONFIG['SMTP_SERVER'], port)
            if EMAIL_CONFIG['USE_TLS']:
                print("📧 Starting TLS...")
                server.starttls()

        # Login if credentials are provided
        if EMAIL_CONFIG['EMAIL_PASSWORD']:
            print("📧 Logging in with credentials...")
            server.login(EMAIL_CONFIG['EMAIL_ADDRESS'], EMAIL_CONFIG['EMAIL_PASSWORD'])
        else:
            print("⚠️  No password configured - attempting to send without authentication")

        print("📧 Sending email...")
        # Send email
        text = msg.as_string()
        server.sendmail(EMAIL_CONFIG['EMAIL_ADDRESS'], to_email, text)
        server.quit()

        print(f"✅ Email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return False



def init_db():
    print("\n=== Initializing Database ===")
    print(f"Database path: {os.path.abspath(DATABASE)}")

    # Use a longer timeout and immediate isolation level to prevent locks
    conn = sqlite3.connect(DATABASE, timeout=30.0, isolation_level='IMMEDIATE')
    c = conn.cursor()
    
    # Enable WAL mode for better concurrent access
    try:
        c.execute("PRAGMA journal_mode=WAL")
        print("Enabled WAL mode for better concurrent access")
    except Exception as e:
        print(f"Could not enable WAL mode: {e}")

    # Check if users table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if not c.fetchone():
        print("Creating users table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                email TEXT UNIQUE,
                password_hash TEXT,
                role TEXT DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        # Add missing columns to existing users table if needed
        new_columns = [
            ('username', 'TEXT'),
            ('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
            ('bbd_form_submitted', 'BOOLEAN DEFAULT 0'),
            ('linked_referral_id', 'INTEGER')
        ]

        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE users ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to users table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column: {e}")
                else:
                    print(f"{column_name} column already exists")
# --- Ensure default admin exists ---
    admin_email = "admin@hmx.com"
    c.execute("SELECT id FROM users WHERE email=?", (admin_email,))
    if not c.fetchone():
        from datetime import datetime
        from werkzeug.security import generate_password_hash

        password_hash = generate_password_hash("JustBrew@45")
        c.execute('''INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        "Admin User",
        admin_email,
        password_hash,
        "admin",
        datetime.now(),
        datetime.now()
        ))
        print("\n✅ Admin user created successfully!")
        print(f"Email: {admin_email}")
        print("Password: JustBrew@45")
    else:
        print("\nℹ️ Admin user already exists")
    # Check if pilots table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pilots'")
    if not c.fetchone():
        print("Creating pilots table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS pilots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                full_name TEXT,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password TEXT,
                password_hash TEXT NOT NULL,
                date_of_birth DATE,
                gender TEXT,
                address TEXT,
                government_id_proof TEXT,
                license_number TEXT,
                issuing_authority TEXT,
                license_issue_date DATE,
                license_expiry_date DATE,
                drone_model TEXT,
                drone_serial TEXT,
                drone_uin TEXT,
                drone_category TEXT,
                total_flying_hours INTEGER,
                flight_records TEXT,
                insurance_policy TEXT,
                insurance_validity DATE,
                pilot_license_url TEXT,
                id_proof_url TEXT,
                training_certificate_url TEXT,
                photograph_url TEXT,
                insurance_certificate_url TEXT,
                experience TEXT,
                equipment TEXT,
                cities TEXT,
                portfolio_url TEXT,
                bank_account TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        # Add missing columns to existing pilots table
        new_columns = [
            ('password_hash', 'TEXT'),
            ('full_name', 'TEXT'),
            ('date_of_birth', 'DATE'),
            ('gender', 'TEXT'),
            ('address', 'TEXT'),
            ('government_id_proof', 'TEXT'),
            ('license_number', 'TEXT'),
            ('issuing_authority', 'TEXT'),
            ('license_issue_date', 'DATE'),
            ('license_expiry_date', 'DATE'),
            ('drone_model', 'TEXT'),
            ('drone_serial', 'TEXT'),
            ('drone_uin', 'TEXT'),
            ('drone_category', 'TEXT'),
            ('total_flying_hours', 'INTEGER'),
            ('flight_records', 'TEXT'),
            ('insurance_policy', 'TEXT'),
            ('insurance_validity', 'DATE'),
            ('pilot_license_url', 'TEXT'),
            ('id_proof_url', 'TEXT'),
            ('training_certificate_url', 'TEXT'),
            ('photograph_url', 'TEXT'),
            ('insurance_certificate_url', 'TEXT'),
            ('portfolio_url', 'TEXT'),
            ('bank_account', 'TEXT'),
            ('experience', 'TEXT'),
            ('equipment', 'TEXT'),
            ('cities', 'TEXT'),
            ('is_approved', 'BOOLEAN DEFAULT 0'),
            ('training_status', 'TEXT DEFAULT "pending"'),
            ('is_pan_india', 'BOOLEAN DEFAULT 0'),
            ('bank_name', 'TEXT'),
            ('account_number', 'TEXT'),
            ('ifsc_code', 'TEXT'),
            ('account_holder_name', 'TEXT')
        ]

        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE pilots ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to pilots table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column: {e}")
                else:
                    print(f"{column_name} column already exists")

    # Check if bookings table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='bookings'")
    if not c.fetchone():
        print("Creating bookings table...")
        c.execute('''
           CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    pilot_id INTEGER,
    editor_id INTEGER,
    referral_id INTEGER,

    -- Booking details
    location_address TEXT,
    gps_link TEXT,
    property_type TEXT,
    indoor_outdoor TEXT,
    area_size REAL,
    area_unit TEXT,
    rooms_sections INTEGER,
    num_floors INTEGER,
    preferred_date DATE,
    preferred_time TEXT,
    special_requirements TEXT,
    drone_permissions_required BOOLEAN,
    -- Cost
    base_package_cost REAL,
    total_cost REAL,
    custom_quote TEXT,

    -- Status / meta
    status TEXT DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','PILOT_ASSIGNED','SHOOT_COMPLETED','EDITING','EDIT_SUBMITTED','REVISION_REQUESTED','APPROVED','COMPLETED')),
    payment_status TEXT DEFAULT 'ESCROW' CHECK (payment_status IN ('PENDING','ESCROW','RELEASED')),
    amount DECIMAL(10,2),
    payment_amount DECIMAL(10,2),
    payment_date TIMESTAMP,
    completed_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_comments TEXT,
    description TEXT,
    delivery_video_link TEXT,
    drive_link TEXT,
    raw_video_url TEXT,
    edited_versions TEXT,
    revision_history TEXT,
    auto_approve_at TIMESTAMP,
    pilot_due_at TIMESTAMP,
    editor_due_at TIMESTAMP,

    -- Earnings
    pilot_earnings DECIMAL(10,2),
    editor_earnings DECIMAL(10,2),
    referral_earnings DECIMAL(10,2),
    hmx_earnings DECIMAL(10,2),
    gateway_fees DECIMAL(10,2),

    -- Relationships
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (pilot_id) REFERENCES pilots (id),
    FOREIGN KEY (editor_id) REFERENCES editors (id),
    FOREIGN KEY (referral_id) REFERENCES referrals (id)
    )
    ''')
    

    else:
        # Add new columns to existing bookings table
        required_columns = {
        "location_address": "TEXT",
        "gps_link": "TEXT",
        "property_type": "TEXT",
        "indoor_outdoor": "TEXT",
        "area_size": "REAL",
        "area_unit": "TEXT",
        "rooms_sections": "INTEGER",
        "num_floors": "INTEGER",
        "preferred_date": "DATE",
        "preferred_time": "TEXT",
        "special_requirements": "TEXT",
        "drone_permissions_required": "BOOLEAN",
        "base_package_cost": "REAL",
        "total_cost": "REAL",
        "custom_quote": "TEXT",
        "amount": "DECIMAL(10,2)",
        "description": "TEXT",
        "delivery_video_link": "TEXT",
        "pilot_earnings": "DECIMAL(10,2)",
        "editor_earnings": "DECIMAL(10,2)",
        "referral_earnings": "DECIMAL(10,2)",
        "hmx_earnings": "DECIMAL(10,2)",
        "gateway_fees": "DECIMAL(10,2)",
        "guest_name": "TEXT",
        "guest_email": "TEXT",
        "guest_phone": "TEXT",
        "guest_address": "TEXT",
        "booking_category": "TEXT",
        "event_name": "TEXT",
        "event_type": "TEXT",
        "event_date": "TEXT",
        "venue_type": "TEXT",
        "shots_required": "TEXT",
        "event_duration_hours": "REAL",
        "budget_range": "TEXT",
        "event_start_date": "TEXT",
        "event_end_date": "TEXT",
        "expected_attendees": "TEXT",
        "organization_name": "TEXT",
        "contact_person": "TEXT",
        "actual_area_size": "REAL",
        "area_mismatch_status": "TEXT DEFAULT 'none'", # 'none', 'reported', 'resolved'
        "area_mismatch_choice": "TEXT", # 'pay_extra', 'keep_original'
        "extra_cost": "REAL DEFAULT 0",
        "business_size": "TEXT",
        "is_custom": "BOOLEAN DEFAULT 0",
        "pilot_assignment_type": "TEXT", # 'local', 'pan_india', 'manual'
        "payment_split_status": "TEXT DEFAULT 'none'",
        "first_payment_made": "BOOLEAN DEFAULT 0",
        "second_payment_made": "BOOLEAN DEFAULT 0",
        "brand_name": "TEXT",
        "owner_social_link": "TEXT",
        "company_name": "TEXT",
        "company_social_link": "TEXT",
        "floor_areas": "TEXT",
        "referral_code": "TEXT",
        "raw_video_url": "TEXT",
        "edited_versions": "TEXT",
        "revision_history": "TEXT",
        "auto_approve_at": "TIMESTAMP",
        "pilot_due_at": "TIMESTAMP",
        "editor_due_at": "TIMESTAMP"
        }
    
        # Get existing columns
        c.execute("PRAGMA table_info(bookings)")
        existing_cols = [row[1] for row in c.fetchall()]

        # Add only missing ones
        for col, col_type in required_columns.items():
            if col not in existing_cols:
                try:
                    print(f"Adding missing column: {col}")
                    c.execute(f"ALTER TABLE bookings ADD COLUMN {col} {col_type}")
                except sqlite3.OperationalError as e:
                    if "duplicate column name" not in str(e):
                        print(f"Error adding {col} column: {e}")
                    else:
                        print(f"{col} column already exists")

    # Check if messages table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'")
    if not c.fetchone():
        print("Creating messages table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                sender_role TEXT NOT NULL,
                receiver_id INTEGER NOT NULL,
                receiver_role TEXT NOT NULL,
                content TEXT NOT NULL,
                status TEXT DEFAULT 'sent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP
            )
        ''')
    else:
        c.execute("PRAGMA table_info(messages)")
        existing_message_cols = [row[1] for row in c.fetchall()]

        column_defaults = {
            'sender_role': ("TEXT NOT NULL DEFAULT 'client'",),
            'receiver_role': ("TEXT NOT NULL DEFAULT 'admin'",),
            'content': ("TEXT",),
            'status': ("TEXT DEFAULT 'sent'",),
            'read_at': ("TIMESTAMP",)
        }

        for column, (definition,) in column_defaults.items():
            if column not in existing_message_cols:
                try:
                    c.execute(f"ALTER TABLE messages ADD COLUMN {column} {definition}")
                    print(f"Added missing column to messages table: {column}")
                    if column == 'content' and 'message' in existing_message_cols:
                        c.execute("UPDATE messages SET content = message WHERE content IS NULL")
                except sqlite3.OperationalError as e:
                    if "duplicate column name" not in str(e):
                        print(f"Error adding messages column {column}: {e}")
                    else:
                        print(f"Messages column {column} already exists")

        if 'message' in existing_message_cols and 'content' in existing_message_cols:
            try:
                c.execute("UPDATE messages SET content = message WHERE content IS NULL")
            except Exception:
                pass

    # Check if videos table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='videos'")
    if not c.fetchone():
        print("Creating videos table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER,
                title TEXT,
                description TEXT,
                status TEXT DEFAULT 'pending',
                review_type TEXT,
                drive_link TEXT,
                review_notes TEXT,
                editor_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings (id),
                FOREIGN KEY (editor_id) REFERENCES editors (id)
            )
        ''')
    else:
        # Check if editor_id column exists
        c.execute("PRAGMA table_info(videos)")
        columns = [column[1] for column in c.fetchall()]
        if 'editor_id' not in columns:
            print("Adding editor_id column to videos table...")
            c.execute('ALTER TABLE videos ADD COLUMN editor_id INTEGER REFERENCES editors(id)')
            print("editor_id column added successfully")
    
    # Check if referrals table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='referrals'")
    if not c.fetchone():
        print("Creating referrals table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE,
                phone TEXT,
                status TEXT DEFAULT 'pending',
                commission_rate DECIMAL(5,2),
                total_earnings DECIMAL(10,2) DEFAULT 0,
                total_referrals INTEGER DEFAULT 0,
                referral_code TEXT,
                referral_link TEXT,
                category TEXT,
                referral_source TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        # Add missing columns to existing referrals table
        new_columns = [
            ('commission_rate', 'DECIMAL(5,2)'),
            ('total_earnings', 'DECIMAL(10,2) DEFAULT 0'),
            ('total_referrals', 'INTEGER DEFAULT 0'),
            ('referral_code', 'TEXT'),
            ('referral_link', 'TEXT'),
            ('category', 'TEXT'),
            ('referral_source', 'TEXT'),
            ('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        ]
        
        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE referrals ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to referrals table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column: {e}")
                else:
                    print(f"{column_name} column already exists")

    # Check if video_reviews table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='video_reviews'")
    if not c.fetchone():
        print("Creating video_reviews table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS video_reviews (
                video_id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                client_id INTEGER,
                editor_id INTEGER,
                pilot_id INTEGER,
                drive_link TEXT,
                submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                admin_comments TEXT,
                pilot_comments TEXT,
                editor_comments TEXT,
                status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'review_changes', 'completed', 'forwarded_to_editor')),
                submission_type TEXT DEFAULT 'pilot' CHECK (submission_type IN ('pilot', 'editor')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES bookings (id),
                FOREIGN KEY (client_id) REFERENCES users (id),
                FOREIGN KEY (editor_id) REFERENCES editors (id),
                FOREIGN KEY (pilot_id) REFERENCES pilots (id)
            )
        ''')
        print("video_reviews table created successfully")

    # Check if editors table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='editors'")
    if not c.fetchone():
        print("Creating editors table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS editors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                full_name TEXT,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password_hash TEXT NOT NULL,
                role TEXT,
                years_experience INTEGER,
                primary_skills TEXT,
                specialization TEXT,
                portfolio_url TEXT,
                time_zone TEXT,
                government_id_url TEXT,
                tax_gst_number TEXT,
                status TEXT DEFAULT 'active',
                approval_status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        # Add missing columns to existing editors table
        new_columns = [
            ('password_hash', 'TEXT'),
            ('experience', 'TEXT'),
            ('equipment', 'TEXT'),
            ('full_name', 'TEXT'),
            ('years_experience', 'INTEGER'),
            ('primary_skills', 'TEXT'),
            ('specialization', 'TEXT'),
            ('portfolio_url', 'TEXT'),
            ('time_zone', 'TEXT'),
            ('government_id_url', 'TEXT'),
            ('tax_gst_number', 'TEXT'),
            ('role', 'TEXT'),
            ('approval_status', 'TEXT DEFAULT "pending"')
        ]

        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE editors ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to editors table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column: {e}")
                else:
                    print(f"{column_name} column already exists")

        # Handle the password column migration
        try:
            # Check if the old password column exists and has NOT NULL constraint
            c.execute("PRAGMA table_info(editors)")
            columns = c.fetchall()
            has_password_column = any(col[1] == 'password' for col in columns)
            has_password_hash_column = any(col[1] == 'password_hash' for col in columns)

            if has_password_column:
                print("Found old password column, performing migration...")

                # If password_hash doesn't exist, copy password data to it
                if not has_password_hash_column:
                    c.execute("ALTER TABLE editors ADD COLUMN password_hash TEXT")
                    print("Added password_hash column")

                # Copy existing password data to password_hash
                c.execute("UPDATE editors SET password_hash = password WHERE password_hash IS NULL AND password IS NOT NULL")

                # Create new table without the password column
                c.execute('''
                    CREATE TABLE editors_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        full_name TEXT,
                        email TEXT UNIQUE NOT NULL,
                        phone TEXT,
                        password_hash TEXT NOT NULL,
                        role TEXT,
                        years_experience INTEGER,
                        primary_skills TEXT,
                        specialization TEXT,
                        portfolio_url TEXT,
                        time_zone TEXT,
                        government_id_url TEXT,
                        tax_gst_number TEXT,
                        status TEXT DEFAULT 'active',
                        approval_status TEXT DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # Copy data from old table to new table
                c.execute('''
                    INSERT INTO editors_new (
                        id, name, full_name, email, phone, password_hash, role, years_experience,
                        primary_skills, specialization, portfolio_url, time_zone,
                        government_id_url, tax_gst_number, status, approval_status, created_at
                    )
                    SELECT
                        id, name, full_name, email, phone, password_hash, role, years_experience,
                        primary_skills, specialization, portfolio_url, time_zone,
                        government_id_url, tax_gst_number,
                        COALESCE(status, 'active'),
                        COALESCE(approval_status, 'pending'),
                        created_at
                    FROM editors
                ''')

                # Drop old table and rename new table
                c.execute("DROP TABLE editors")
                c.execute("ALTER TABLE editors_new RENAME TO editors")
                print("Successfully migrated editors table structure")

        except sqlite3.OperationalError as e:
            print(f"Migration error (this might be normal for new installations): {e}")
            pass

    # Check if business_clients table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='business_clients'")
    if not c.fetchone():
        print("Creating business_clients table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS business_clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_name TEXT NOT NULL,
                registration_number TEXT NOT NULL,
                organization_type TEXT NOT NULL,
                incorporation_date DATE NOT NULL,
                official_address TEXT NOT NULL,
                official_email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                contact_name TEXT NOT NULL,
                contact_person_designation TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                registration_certificate_url TEXT,
                tax_identification_url TEXT,
                business_license_url TEXT,
                address_proof_url TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("Business clients table created successfully")
    else:
        print("Business clients table already exists")

    # Check if editor_applications table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='editor_applications'")
    if not c.fetchone():
        print("Creating editor_applications table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS editor_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                role TEXT NOT NULL,
                years_experience INTEGER NOT NULL,
                primary_skills TEXT NOT NULL,
                specialization TEXT NOT NULL,
                portfolio_url TEXT,
                time_zone TEXT,
                government_id_url TEXT,
                tax_gst_number TEXT,
                password_hash TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                admin_comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("Editor applications table created successfully")
    else:
        print("Editor applications table already exists")

    # Check if referral_applications table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='referral_applications'")
    if not c.fetchone():
        print("Creating referral_applications table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS referral_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                location TEXT,
                experience TEXT,
                network_size TEXT,
                referral_strategy TEXT,
                social_media_links TEXT,
                password_hash TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                admin_comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("Referral applications table created successfully")
    else:
        print("Referral applications table already exists")

    # Check if business_client_applications table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='business_client_applications'")
    if not c.fetchone():
        print("Creating business_client_applications table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS business_client_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_name TEXT NOT NULL,
                registration_number TEXT NOT NULL,
                organization_type TEXT NOT NULL,
                incorporation_date DATE NOT NULL,
                official_address TEXT NOT NULL,
                official_email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                contact_name TEXT NOT NULL,
                contact_person_designation TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                registration_certificate_url TEXT,
                tax_identification_url TEXT,
                business_license_url TEXT,
                address_proof_url TEXT,
                status TEXT DEFAULT 'pending',
                admin_comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("Business client applications table created successfully")
    else:
        print("Business client applications table already exists")

    # Check if inquiries table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='inquiries'")
    if not c.fetchone():
        print("Creating inquiries table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS inquiries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT,
                phone TEXT,
                message TEXT,
                status TEXT DEFAULT 'new',
                source TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    # Check if payments table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='payments'")
    if not c.fetchone():
        print("Creating payments table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER,
                amount DECIMAL(10,2),
                status TEXT DEFAULT 'pending',
                payment_method TEXT,
                transaction_id TEXT,
                merchant_transaction_id TEXT,
                phonepe_transaction_id TEXT,
                payment_gateway TEXT DEFAULT 'phonepe',
                gateway_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings (id)
            )
        ''')
    else:
        # Add PhonePe specific columns to existing payments table
        new_columns = [
            ('merchant_transaction_id', 'TEXT'),
            ('merchant_order_id', 'TEXT'),
            ('phonepe_transaction_id', 'TEXT'),
            ('payment_gateway', 'TEXT DEFAULT "phonepe"'),
            ('gateway_response', 'TEXT')
        ]
        
        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE payments ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to payments table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column: {e}")
                else:
                    print(f"{column_name} column already exists")
    
    # Check if cancellations table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cancellations'")
    if not c.fetchone():
        print("Creating cancellations table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS cancellations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER,
                reason TEXT,
                status TEXT DEFAULT 'pending',
                refund_amount DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings (id)
            )
        ''')
    
    # Check if pre_list table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pre_list'")
    if not c.fetchone():
        print("Creating pre_list table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS pre_list (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    # Check if otp_verifications table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='otp_verifications'")
    if not c.fetchone():
        print("Creating otp_verifications table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS otp_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                otp_code TEXT NOT NULL,
                user_type TEXT NOT NULL,
                user_data TEXT NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("OTP verifications table created successfully")
    else:
        print("OTP verifications table already exists")
    
    # Check if editors table exists (assuming it's created elsewhere or needs to be created)
    # If 'editors' table doesn't exist, this block will be skipped.
    # If it exists, it will attempt to add bank details.
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='editors'")
    if c.fetchone():
        # Add bank details to editors if they don't exist
        editor_bank_columns = [
            ('password_hash', 'TEXT'), # Added password_hash to editors table
            ('bank_name', 'TEXT'),
            ('account_number', 'TEXT'),
            ('ifsc_code', 'TEXT'),
            ('account_holder_name', 'TEXT')
        ]
        for column_name, column_type in editor_bank_columns:
            try:
                c.execute(f'ALTER TABLE editors ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to editors table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column to editors: {e}")
                else:
                    print(f"{column_name} column already exists in editors")
    
    # Check if pilot_applications table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pilot_applications'")
    if not c.fetchone():
        print("Creating pilot_applications table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS pilot_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                full_name TEXT,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password TEXT,
                password_hash TEXT NOT NULL,
                date_of_birth DATE,
                gender TEXT,
                address TEXT,
                government_id_proof TEXT,
                license_number TEXT,
                issuing_authority TEXT,
                license_issue_date DATE,
                license_expiry_date DATE,
                drone_model TEXT,
                drone_serial TEXT,
                drone_uin TEXT,
                drone_category TEXT,
                total_flying_hours INTEGER,
                flight_records TEXT,
                insurance_policy TEXT,
                insurance_validity DATE,
                pilot_license_url TEXT,
                id_proof_url TEXT,
                training_certificate_url TEXT,
                photograph_url TEXT,
                insurance_certificate_url TEXT,
                cities TEXT,
                experience TEXT,
                equipment TEXT,
                portfolio_url TEXT,
                bank_account TEXT,
                status TEXT DEFAULT 'pending',
                admin_comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("Pilot applications table created successfully")
    else:
        # Add missing columns to existing pilot_applications table
        new_columns = [
            ('password_hash', 'TEXT'),
            ('full_name', 'TEXT'),
            ('date_of_birth', 'DATE'),
            ('gender', 'TEXT'),
            ('address', 'TEXT'),
            ('government_id_proof', 'TEXT'),
            ('license_number', 'TEXT'),
            ('issuing_authority', 'TEXT'),
            ('license_issue_date', 'DATE'),
            ('license_expiry_date', 'DATE'),
            ('drone_model', 'TEXT'),
            ('drone_serial', 'TEXT'),
            ('drone_uin', 'TEXT'),
            ('drone_category', 'TEXT'),
            ('total_flying_hours', 'INTEGER'),
            ('flight_records', 'TEXT'),
            ('insurance_policy', 'TEXT'),
            ('insurance_validity', 'DATE'),
            ('pilot_license_url', 'TEXT'),
            ('id_proof_url', 'TEXT'),
            ('training_certificate_url', 'TEXT'),
            ('photograph_url', 'TEXT'),
            ('insurance_certificate_url', 'TEXT'),
            ('portfolio_url', 'TEXT'),
            ('bank_account', 'TEXT'),
            ('admin_comments', 'TEXT')
        ]

        for column_name, column_type in new_columns:
            try:
                c.execute(f'ALTER TABLE pilot_applications ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to pilot_applications table")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding {column_name} column to pilot_applications: {e}")
                else:
                    print(f"{column_name} column already exists in pilot_applications")
        print("Pilot applications table updated successfully")
    
    # Check if fpv_events table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='fpv_events'")
    if not c.fetchone():
        print("Creating fpv_events table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS fpv_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_name TEXT,
                event_type TEXT,
                event_date TEXT,
                location_address TEXT,
                gps_link TEXT,
                venue_type TEXT,
                shots_required TEXT,
                event_duration_hours REAL,
                budget_range TEXT,
                preferred_date TEXT,
                preferred_time TEXT,
                event_start_date TEXT,
                event_end_date TEXT,
                expected_attendees TEXT,
                organization_name TEXT,
                contact_person TEXT,
                guest_name TEXT NOT NULL,
                guest_email TEXT NOT NULL,
                guest_phone TEXT,
                guest_address TEXT,
                special_requirements TEXT,
                referral_id INTEGER,
                pilot_id INTEGER,
                editor_id INTEGER,
                status TEXT DEFAULT 'pending',
                payment_status TEXT DEFAULT 'pending',
                base_package_cost REAL,
                total_cost REAL,
                admin_comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (referral_id) REFERENCES referrals (id),
                FOREIGN KEY (pilot_id) REFERENCES pilots (id),
                FOREIGN KEY (editor_id) REFERENCES editors (id)
            )
        ''')
        print("fpv_events table created successfully")
    else:
        print("fpv_events table already exists")
    
    # Check if email_templates table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='email_templates'")
    if not c.fetchone():
        print("Creating email_templates table...")
        c.execute('''
            CREATE TABLE IF NOT EXISTS email_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                subject TEXT,
                body TEXT
            )
        ''')

        default_templates = [
    ("approval", "Application Approved", 
     "Dear {{applicant_name}},<br><br>Your {{application_type}} application has been approved.<br>{{admin_comments}}<br><br>Welcome aboard!"),

    ("rejection", "Application Rejected", 
     "Dear {{applicant_name}},<br><br>Unfortunately, your {{application_type}} application was not successful.<br>{{admin_comments}}"),

    ("forgot_password", "Password Reset Request", 
     "Hello {{name}},<br><br>Please use this link to reset your password: {{reset_link}}"),

    ("welcome", "Welcome to HMX FPV Tours", 
     "Hi {{name}},<br><br>We are excited to have you onboard as a {{user_role}}."),

    ("otp", "Your OTP Code", 
     "Dear {{name}},<br><br>Your OTP is <b>{{otp}}</b>. It expires in 10 minutes.<br><br>Regards,<br>Team HMX"),

    ("order_created", "Your Booking {{booking_id}} is Created", 
     "Dear {{name}},<br><br>Your booking {{booking_id}} for {{location}} on {{date}} has been created successfully."),

    # 🚀 NEW: Booking status templates
    ("order_approved", "Your Booking {{booking_id}} is Approved",
     "Dear {{name}},<br><br>Your booking <b>{{booking_id}}</b> for {{location}} on {{date}} has been <b>approved</b>.<br><br>"
     "Our pilot/editor team will coordinate with you shortly.<br><br>Regards,<br>Team HMX"),

    ("order_cancelled", "Your Booking {{booking_id}} is Cancelled",
     "Dear {{name}},<br><br>We regret to inform you that your booking <b>{{booking_id}}</b> has been <b>cancelled</b>.<br>"
     "Reason: {{reason}}<br><br>If you believe this was a mistake, please contact our support team.<br><br>Regards,<br>Team HMX"),

    ("order_deleted", "Your Booking {{booking_id}} was Deleted",
     "Dear {{name}},<br><br>Your booking <b>{{booking_id}}</b> has been <b>removed</b> from our system.<br><br>"
     "If you did not request this or have questions, please reach out to support.<br><br>Regards,<br>Team HMX"),

    # Existing credential templates...
    ("pilot_credentials", "Your Pilot Account Credentials",
     "Hi {{name}},<br><br>Your pilot account has been created.<br><br>"
     "<b>Email:</b> {{email}}<br>"
     "<b>Password:</b> {{password}}<br><br>"
     "Please log in and change your password after first login.<br><br>Regards,<br>Team HMX"),

    ("editor_credentials", "Your Editor Account Credentials",
     "Hi {{name}},<br><br>Your editor account has been created.<br><br>"
     "<b>Email:</b> {{email}}<br>"
     "<b>Password:</b> {{password}}<br><br>"
     "Please log in and change your password after first login.<br><br>Regards,<br>Team HMX"),

    ("referral_credentials", "Your Referral Partner Credentials",
     "Hi {{name}},<br><br>Your referral partner account has been created.<br><br>"
     "<b>Email:</b> {{email}}<br>"
     "<b>Password:</b> {{password}}<br><br>"
     "You can now log in and start referring clients.<br><br>Regards,<br>Team HMX"),

    ("client_credentials", "Your Client Account Credentials",
     "Hi {{name}},<br><br>Your client account has been created.<br><br>"
     "<b>Email:</b> {{email}}<br>"
     "<b>Password:</b> {{password}}<br><br>"
     "You can log in and follow up on your bookings.<br><br>"
     "Please change your password after first login.<br><br>Regards,<br>Team HMX"),
    ]


        for tpl in default_templates:
            c.execute(
                "INSERT OR IGNORE INTO email_templates (name, subject, body) VALUES (?, ?, ?)", tpl
            )
        print("Default email templates inserted")
    else:
        print("Email_templates table already exists")


    conn.commit()
    conn.close()
    print("Database initialization complete!")
    print("===================\n")

def get_db():
    print(f"\n=== Database Connection ===")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Looking for database at: {os.path.abspath(DATABASE)}")
    print(f"Database exists: {os.path.exists(DATABASE)}")
    
    # Add timeout to prevent database locked errors
    conn = sqlite3.connect(DATABASE, timeout=30.0)
    conn.row_factory = sqlite3.Row
    
    # Verify users table
    cursor = conn.cursor()
    users = cursor.execute('SELECT * FROM users').fetchall()
    print(f"Number of users in database: {len(users)}")
    for user in users:
        print(f"Found user: {user['email']} (ID: {user['id']})")
    print("===================\n")
    
    return conn

# OTP Helper Functions
def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def store_otp(email, user_type, user_data):
    """Store OTP in database for verification"""
    try:
        otp_code = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=10)  # OTP expires in 10 minutes
        
        # Save consistently as ISO string
        expires_at_str = expires_at.isoformat(sep=" ", timespec="seconds")
        # 👉 Example: "2025-08-28 13:15:42"
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Delete any existing OTP for this email
        cursor.execute('DELETE FROM otp_verifications WHERE email = ?', (email,))
        
        # Store new OTP
        cursor.execute('''
            INSERT INTO otp_verifications (email, otp_code, user_type, user_data, expires_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (email, otp_code, user_type, json.dumps(user_data), expires_at_str))
        
        conn.commit()
        conn.close()
        
        print(f"OTP stored for {email}: {otp_code} (expires at {expires_at_str})")
        return otp_code
        
    except Exception as e:
        print(f"Error storing OTP: {str(e)}")
        return None

def verify_otp(email, otp_code):
    """Verify OTP and return user data if valid"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Get OTP record
        cursor.execute('''
            SELECT otp_code, user_type, user_data, expires_at, is_verified
            FROM otp_verifications 
            WHERE email = ?
            ORDER BY created_at DESC 
            LIMIT 1
        ''', (email,))
        
        otp_record = cursor.fetchone()
        
        if not otp_record:
            conn.close()
            return {'success': False, 'error': 'No OTP found for this email'}
        
        stored_otp, user_type, user_data_json, expires_at, is_verified = otp_record
        
        # Handle datetime parsing safely (with microseconds)
        try:
            expires_at = datetime.fromisoformat(expires_at)
        except Exception:
            try:
                expires_at = datetime.strptime(expires_at, '%Y-%m-%d %H:%M:%S.%f')
            except Exception:
                expires_at = datetime.strptime(expires_at, '%Y-%m-%d %H:%M:%S')
        
        # Check if OTP is already verified
        if is_verified:
            conn.close()
            return {'success': False, 'error': 'OTP already used'}
        
        # Check if OTP is expired
        if datetime.now() > expires_at:
            conn.close()
            return {'success': False, 'error': 'OTP has expired'}
        
        # Verify OTP code
        if stored_otp != otp_code:
            conn.close()
            return {'success': False, 'error': 'Invalid OTP'}
        
        # Mark OTP as verified
        cursor.execute(
            'UPDATE otp_verifications SET is_verified = TRUE WHERE email = ?',
            (email,)
        )
        conn.commit()
        conn.close()
        
        # Return success with user data
        return {
            'success': True,
            'user_type': user_type,
            'user_data': json.loads(user_data_json)
        }
        
    except Exception as e:
        print(f"Error verifying OTP: {str(e)}")
        return {'success': False, 'error': 'Server error while verifying OTP'}


# Initialize database
init_db()

# Initialize business booking routes
# Only initialize and register the blueprint if it's not already registered
if 'business_booking' not in app.blueprints:
    business_bp = init_business_booking_routes(app, get_db, send_email_async, generate_random_password)
    app.register_blueprint(business_bp)

# Initialize payment routes
if 'payment' not in app.blueprints:
    # Pass get_db function to the routes
    payment_bp = init_payment_routes(app, get_db)
    app.register_blueprint(payment_bp)

# Update the token_required decorator to skip OPTIONS requests
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        print("\n=== Token Verification ===")
        # Skip token check for OPTIONS requests
        token = request.headers.get('Authorization')
        if not token:
            print("No token found in Authorization header")
            return jsonify({'message': 'Token is missing'}), 401

        try:
            print(f"Received token: {token}")
            user_data = fetch_user_from_token(token)
            print("✅ Token verification successful")
            print(f"🔑 Token role: {user_data['role']}")
            print(f"👤 Token user_id: {user_data['user_id']}")
            print(f"📋 User data being passed to endpoint: {user_data}")
            print(f"🎯 Endpoint being called: {request.endpoint}")
            print("=" * 50)
            return f(user_data, *args, **kwargs)

        except ValueError as ve:
            print(f"Token validation error: {str(ve)}")
            return jsonify({'message': str(ve)}), 401
        except Exception as e:
            print(f"Token verification failed: {str(e)}")
            return jsonify({'message': 'Invalid token'}), 401

    return decorated

# Helper functions
def get_user_by_id(user_id):
    print(f"\n=== Looking up user by ID ===")
    print(f"ID to find: {user_id}")
    
    conn = get_db()
    
    # First check users table
    user = conn.execute('SELECT *, "client" as role FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if not user:
        # If not found in users, check pilots table
        user = conn.execute('SELECT *, "pilot" as role FROM pilots WHERE id = ?', (user_id,)).fetchone()
    
    conn.close()
    
    if user:
        print(f"Found user in database:")
        print(f"ID: {user['id']}")
        print(f"Email: {user['email']}")
        print(f"Role: {user['role']}")
        if 'approval_status' in user:
            print(f"Approval: {user['approval_status']}")
        elif 'status' in user:
            print(f"Status: {user['status']}")
        print()
    else:
        print("No user found with that ID\n")
    
    return dict(user) if user else None


@app.route('/api/messages', methods=['GET'])
@token_required
def get_messages(current_user):
    user_id = current_user['user_id']
    role = current_user['role']
    partner_id = request.args.get('with')

    conn = get_db()
    cursor = conn.cursor()

    try:
        if partner_id is not None:
            try:
                partner_id_int = int(partner_id)
            except ValueError:
                conn.close()
                return jsonify({'message': 'Invalid partner id'}), 400

            cursor.execute('''
                SELECT * FROM messages
                WHERE (
                    sender_id = ? AND receiver_id = ?
                ) OR (
                    sender_id = ? AND receiver_id = ?
                )
                ORDER BY created_at ASC
            ''', (user_id, partner_id_int, partner_id_int, user_id))

            messages = [serialize_message(dict(row)) for row in cursor.fetchall()]

            cursor.execute('''
                UPDATE messages
                SET status = 'delivered', read_at = COALESCE(read_at, datetime('now'))
                WHERE receiver_id = ? AND sender_id = ? AND status = 'sent'
            ''', (user_id, partner_id_int))
            conn.commit()
        else:
            cursor.execute('''
                SELECT * FROM messages
                WHERE sender_id = ? OR receiver_id = ?
                ORDER BY created_at DESC
                LIMIT 50
            ''', (user_id, user_id))
            messages = [serialize_message(dict(row)) for row in cursor.fetchall()]

        conn.close()
        return jsonify({
            'messages': messages,
            'current_user': {
                'id': user_id,
                'role': role
            }
        })
    except Exception as e:
        conn.close()
        print(f"Error fetching messages: {str(e)}")
        return jsonify({'message': 'Failed to fetch messages'}), 500


@app.route('/api/messages', methods=['POST'])
@token_required
def send_message(current_user):
    data = request.get_json() or {}
    receiver_id = data.get('receiver_id')
    content = (data.get('content') or '').strip()
    receiver_role = data.get('receiver_role', 'client')

    if not receiver_id or not content:
        return jsonify({'message': 'receiver_id and content are required'}), 400

    try:
        receiver_id_int = int(receiver_id)
    except ValueError:
        return jsonify({'message': 'receiver_id must be a number'}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO messages (
                sender_id, sender_role, receiver_id, receiver_role, content, status
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            current_user['user_id'],
            current_user['role'],
            receiver_id_int,
            receiver_role,
            content,
            'sent'
        ))

        message_id = cursor.lastrowid
        conn.commit()

        cursor.execute('SELECT * FROM messages WHERE id = ?', (message_id,))
        message = serialize_message(dict(cursor.fetchone()))
        conn.close()

        emit_message_events(message)

        return jsonify(message), 201
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Error sending message: {str(e)}")
        return jsonify({'message': 'Failed to send message'}), 500

def get_user_by_email(email):
    print(f"\n=== Looking up user by email ===")
    print(f"Email to find: {email}")
    
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    
    if user:
        print(f"Found user in database:")
        print(f"ID: {user['id']}")
        print(f"Email: {user['email']}")
        print(f"Role: {user['role']}")
        print(f"Approval: {user['approval_status']}\n")
    else:
        print("No user found with that email\n")
    
    return dict(user) if user else None

# Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        print("\n=== New User Registration ===")
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request method: {request.method}")
        print(f"Request content type: {request.content_type}")
        
        # Get and validate request data
        try:
            data = request.get_json()
            print(f"Registration data received: {data}")
        except Exception as e:
            print(f"Error parsing JSON data: {str(e)}")
            return jsonify({'message': 'Invalid JSON data'}), 400
        
        if not data:
            print("No data received in request")
            return jsonify({'message': 'No data received'}), 400

        # Validate required fields
        required_fields = [
            'business_name', 'contact_name', 'email', 'phone', 'password',
            'registration_number', 'organization_type', 'incorporation_date',
            'official_address', 'official_email', 'contact_person_designation'
        ]
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        if missing_fields:
            print(f"Missing required fields: {missing_fields}")
            return jsonify({'message': f'Missing required fields: {", ".join(missing_fields)}'}), 400

        # Validate email format
        if '@' not in data['email'] or '.' not in data['email']:
            print(f"Invalid email format: {data['email']}")
            return jsonify({'message': 'Invalid email format'}), 400

        # Validate official email format
        if '@' not in data['official_email'] or '.' not in data['official_email']:
            print(f"Invalid official email format: {data['official_email']}")
            return jsonify({'message': 'Invalid official email format'}), 400

        # Validate password length
        if len(data['password']) < 8:
            print("Password too short")
            return jsonify({'message': 'Password must be at least 8 characters long'}), 400

        # Validate incorporation date format (YYYY-MM-DD)
        try:
            from datetime import datetime
            datetime.strptime(data['incorporation_date'], '%Y-%m-%d')
        except ValueError:
            print(f"Invalid incorporation date format: {data['incorporation_date']}")
            return jsonify({'message': 'Invalid incorporation date format. Use YYYY-MM-DD'}), 400

        # Validate organization type
        valid_org_types = ['Private Limited', 'Public Limited', 'Partnership', 'LLP', 'Sole Proprietorship', 'NGO', 'Trust', 'Society', 'Other']
        if data['organization_type'] not in valid_org_types:
            print(f"Invalid organization type: {data['organization_type']}")
            return jsonify({'message': f'Invalid organization type. Must be one of: {", ".join(valid_org_types)}'}), 400

        # Check if email already exists in applications or main table
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM business_client_applications WHERE (email = ? OR official_email = ?) AND status = "pending"',
                      (data['email'], data['official_email']))
        if cursor.fetchone():
            print(f"Email {data['email']} or official email {data['official_email']} already has pending application")
            conn.close()
            return jsonify({'message': 'Application already submitted with this email'}), 400

        cursor.execute('SELECT id FROM business_clients WHERE email = ? OR official_email = ?',
                      (data['email'], data['official_email']))
        if cursor.fetchone():
            print(f"Email {data['email']} or official email {data['official_email']} already registered")
            conn.close()
            return jsonify({'message': 'Email already registered'}), 400

        try:
            # Generate password hash using werkzeug
            password_hash = generate_password_hash(data['password'])
            print("Password hash generated successfully")

            # Insert new business client application
            cursor.execute('''
                INSERT INTO business_client_applications (
                    business_name,
                    registration_number,
                    organization_type,
                    incorporation_date,
                    official_address,
                    official_email,
                    phone,
                    contact_name,
                    contact_person_designation,
                    email,
                    password_hash,
                    registration_certificate_url,
                    tax_identification_url,
                    business_license_url,
                    address_proof_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['business_name'],
                data['registration_number'],
                data['organization_type'],
                data['incorporation_date'],
                data['official_address'],
                data['official_email'],
                data['phone'],
                data['contact_name'],
                data['contact_person_designation'],
                data['email'],
                password_hash,
                data.get('registration_certificate_url', ''),
                data.get('tax_identification_url', ''),
                data.get('business_license_url', ''),
                data.get('address_proof_url', '')
            ))
            print("Business client application submitted to database")

            # Commit transaction
            conn.commit()
            application_id = cursor.lastrowid
            print(f"New business client application created with ID: {application_id}")
            print(f"Email: {data['email']}")
            print(f"Business: {data['business_name']}")
            print(f"Status: pending")

            # Close database connection
            conn.close()
            print("Database connection closed")

            response = jsonify({
                'message': 'Business application submitted successfully. Please wait for admin approval.',
                'application_id': application_id
            })
            response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 201

        except sqlite3.Error as e:
            print(f"Database error: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return jsonify({'message': f'Database error: {str(e)}'}), 500

    except Exception as e:
        print(f"Unexpected error during registration: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        response = jsonify({'message': 'Registration failed due to an unexpected error'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    try:
        print("\n=== Login Attempt ===")
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request method: {request.method}")
        print(f"Request content type: {request.content_type}")

        # Get and validate request data
        try:
            data = request.get_json()
            print(f"Login data received: {data}")
        except Exception as e:
            print(f"Error parsing JSON data: {str(e)}")
            return jsonify({'message': 'Invalid JSON data'}), 400

        if not data:
            print("No data received in request")
            return jsonify({'message': 'No data received'}), 400

        # Validate required fields
        if 'email' not in data or not data['email']:
            print("Email is required")
            return jsonify({'message': 'Email is required'}), 400
        if 'password' not in data or not data['password']:
            print("Password is required")
            return jsonify({'message': 'Password is required'}), 400

        email = data['email']
        password = data['password']
        print(f"Attempting login for email: {email}")

        # First check pilots table
        conn = get_db()
        cursor = conn.cursor()
        
        print("Checking pilots table...")
        cursor.execute('SELECT * FROM pilots WHERE email = ?', (email,))
        pilot = cursor.fetchone()
        
        if pilot:
            print("Found pilot in database")
            pilot_dict = dict(pilot)
            print(f"Pilot status: {pilot_dict['status']}")
            
            # Check if pilot has password_hash or password field
            password_field = pilot_dict.get('password_hash') or pilot_dict.get('password')
            if password_field:
                print(f"Pilot password hash: {password_field[:20]}...")
            else:
                print("No password field found for pilot")
                return jsonify({'message': 'Invalid email or password'}), 401
            
            if pilot_dict['status'] == 'pending':
                print("Pilot is pending approval")
                return jsonify({'message': 'Your account is pending approval'}), 403
            
            print("Verifying pilot password...")
            password_check = verify_password(password, password_field)
            print(f"Password verification result: {password_check}")
            
            if password_check:
                print("Password verified for pilot")
                token_data = {
                    'user_id': pilot_dict['id'],
                    'role': 'pilot',
                    'exp': datetime.utcnow() + timedelta(days=1)
                }
                print(f"Token data: {token_data}")
                token = jwt.encode(token_data, app.config['SECRET_KEY'])
                print("Generated token for pilot")
                
                response = jsonify({
                    'token': token,
                    'role': 'pilot',
                    'user_id': pilot_dict['id']
                })
                response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
                response.headers.add('Access-Control-Allow-Credentials', 'true')
                return response
            else:
                print("Invalid password for pilot")
                return jsonify({'message': 'Invalid email or password'}), 401
        
        # Check editors table
        print("Pilot not found, checking editors table...")
        cursor.execute('SELECT * FROM editors WHERE email = ?', (email,))
        editor = cursor.fetchone()
        
        if editor:
            print("Found editor in database")
            editor_dict = dict(editor)
            print(f"Editor status: {editor_dict['status']}")
            
            # Check if editor has password_hash or password field
            password_field = editor_dict.get('password_hash') or editor_dict.get('password')
            if password_field:
                print(f"Editor password hash: {password_field[:20]}...")
            else:
                print("No password field found for editor")
                return jsonify({'message': 'Invalid email or password'}), 401
            
            if editor_dict['status'] == 'pending':
                print("Editor is pending approval")
                return jsonify({'message': 'Your account is pending approval'}), 403
            
            print("Verifying editor password...")
            password_check = verify_password(password, password_field)
            print(f"Password verification result: {password_check}")
            
            if password_check:
                print("Password verified for editor")
                token_data = {
                    'user_id': editor_dict['id'],
                    'role': 'editor',
                    'exp': datetime.utcnow() + timedelta(days=1)
                }
                print(f"Token data: {token_data}")
                token = jwt.encode(token_data, app.config['SECRET_KEY'])
                print("Generated token for editor")
                
                response = jsonify({
                    'token': token,
                    'role': 'editor',
                    'user_id': editor_dict['id']
                })
                response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
                response.headers.add('Access-Control-Allow-Credentials', 'true')
                return response
            else:
                print("Invalid password for editor")
                return jsonify({'message': 'Invalid email or password'}), 401
        
        # Check users table (for all user types including clients and admins)
        print("Checking users table...")
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()

        if user:
            user_dict = dict(user)
            user_role = user_dict.get('role', 'admin')
            print(f"Found user in database with role: {user_role}")
            print(f"User password hash: {user_dict['password_hash'][:20]}...")

            print("Verifying user password...")
            password_check = verify_password(password, user_dict['password_hash'])
            print(f"Password verification result: {password_check}")

            if password_check:
                print(f"Password verified for {user_role} user")

                # For clients, also get business details
                business_name = None
                if user_role == 'client':
                    cursor.execute('SELECT business_name FROM business_clients WHERE email = ?', (email,))
                    business_result = cursor.fetchone()
                    if business_result:
                        business_name = business_result[0]

                token_data = {
                    'user_id': user_dict['id'],
                    'email': user_dict['email'],
                    'role': user_role,
                    'exp': datetime.utcnow() + timedelta(days=1)
                }
                print(f"Token data: {token_data}")
                token = jwt.encode(token_data, app.config['SECRET_KEY'])
                print(f"Generated token for {user_role} user")

                response_data = {
                    'token': token,
                    'role': user_role,
                    'user_id': user_dict['id']
                }

                # Add business name for clients
                if business_name:
                    response_data['business_name'] = business_name

                response = jsonify(response_data)
                response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
                response.headers.add('Access-Control-Allow-Credentials', 'true')
                return response
            else:
                print("Invalid password for user")
                return jsonify({'message': 'Invalid email or password'}), 401
        else:
            print("User not found in users table")
            return jsonify({'message': 'Invalid email or password'}), 401
        
        conn.close()

    except Exception as e:
        print(f"Unexpected error during login: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        response = jsonify({'message': 'Login failed due to an unexpected error'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/auth/verify', methods=['GET'])
@token_required
def verify_token(current_user):
    try:
        print('\n=== Verifying Token ===')
        print('User data received:', current_user)
        
        # Return the user data with the role from the token
        return jsonify({
            'id': current_user.get('id', current_user['user_id']),
            'user_id': current_user['user_id'],
            'email': current_user['email'],
            'role': current_user['role'],
            'approval_status': current_user.get('status', current_user.get('approval_status', 'approved'))
        })
        
    except Exception as e:
        print('Error in verify_token:', str(e))
        return jsonify({'error': 'Token verification failed'}), 401

@app.route('/api/bookings', methods=['GET', 'POST'])
@token_required
def get_bookings(current_user):
    pass

    def calculate_cost(category, area_sqft, num_floors):
        COSTING_TABLE = {
            "Retail Store / Showroom":      [5999,  9999,  15999, 20999, None],
            "Restaurants & Cafes":          [7999, 11999, 19999, 25999, None],
            "Fitness & Sports Arenas":      [9999, 13999, 22999, 31999, None],
            "Resorts & Farmstays / Hotels": [11999,17999, 29999, 39999, None],
            "Real Estate Property":         [13999,23999, 37999, 49999, None],
            "Shopping Mall / Complex":      [15999,29999, 47999, 63999, None],
            "Adventure / Water Parks":      [12999,23999, 39999, 55999, None],
            "Gaming & Entertainment Zones": [10999,19999, 33999, 45999, None],
        }
        if category not in BASE_COSTS:
            return None, None, "Invalid category"
            
        # Calculate base cost
        base_cost = BASE_COSTS[category]
        
        # Calculate total cost using the formula: Base Cost + (Area × 1)
        total_cost = base_cost + (area_sqft * 1)

        # Floor adjustment (if needed in the future)
        # For now, keeping the floor adjustment but applying to the total cost
        if num_floors is None or num_floors < 1:
            num_floors = 1
        final_cost = int(total_cost * (1 + 0.1 * (num_floors - 1)))

        return base_cost, final_cost, None

    if request.method == 'POST':
        data = request.json
        print("\n=== Creating New Booking ===")
        try:
            conn = get_db()
            cursor = conn.cursor()

            # ✅ Determine which user to attach
            if current_user['role'] == 'client':
                # Logged-in client
                client_user_id = current_user['id']
                client_email = current_user['email']
                client_name = current_user.get('contact_name') or current_user.get('username') or "Client"
            else:
                # Admin creating on behalf of a client (old logic)
                client_email = data.get("client_email")
                client_name = data.get("client_name", "New Client")
                cursor.execute("SELECT id FROM users WHERE email=?", (client_email,))
                user = cursor.fetchone()
                if not user:
                    # Create random password
                    raw_password = generate_random_password()
                    password_hash = generate_password_hash(raw_password)

                    # Insert into users
                    cursor.execute('''
                        INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
                        VALUES (?, ?, ?, 'client', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ''', (client_name, client_email, password_hash))
                    client_user_id = cursor.lastrowid

                    # Insert into business_clients with minimal info
                    cursor.execute('''
                        INSERT INTO business_clients (
                            business_name, registration_number, organization_type,
                            incorporation_date, official_address, official_email,
                            phone, contact_name, contact_person_designation,
                            email, password_hash, status, created_at, updated_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ''', ("", "", "", "", "", client_email, "", "", "", client_email, password_hash))

                    # Send credentials email
                    send_email_with_template_helper(
                        to_email=client_email,
                        template_name="client_credentials",
                        variables={
                            "name": client_name,
                            "email": client_email,
                            "password": raw_password
                        }
                    )
                    conn.commit()
                else:
                    client_user_id = user["id"]

            # --- Cost + Earnings calculation (your existing logic) ---
            # Required fields check
            required_fields = [
                'location_address', 'property_type', 'indoor_outdoor', 'area_size',
                'rooms_sections', 'preferred_date', 'preferred_time'
            ]
            for field in required_fields:
                if field not in data or not data[field]:
                    return jsonify({'message': f'Missing required field: {field}'}), 400

            area_size = float(data['area_size'])
            rooms_sections = int(data['rooms_sections'])
            num_floors = int(data.get('num_floors', 1))
            # Normalize area to sqft if unit is acres
            area_unit = str(data.get('area_unit', 'sq_ft')).lower()
            area_sqft = area_size * 43560 if 'acre' in area_unit else area_size

            base_cost, final_cost, error = calculate_cost(
                data['property_type'], area_sqft, num_floors
            )
            if error:
                return jsonify({'message': error}), 400

            total_cost = final_cost
            has_referral = bool(data.get('referral_id'))

            def calculate_earnings(total_cost, has_referral):
                # New Revenue Split (Point 11)
                pilot_pct = 0.65
                editor_pct = 0.10
                hmx_pct = 0.15
                referral_pct = 0.10 if has_referral else 0.0
                
                # If no referral, HMX keeps the referral share (25% total)
                if not has_referral:
                    hmx_pct = 0.25
                
                return {
                    "pilot_earnings": round(total_cost * pilot_pct, 2),
                    "editor_earnings": round(total_cost * editor_pct, 2),
                    "referral_earnings": round(total_cost * referral_pct, 2),
                    "hmx_earnings": round(total_cost * hmx_pct, 2)
                }
            has_referral = bool(data.get('referral_id'))
            earn = calculate_earnings(total_cost, has_referral)

            # --- Insert booking ---
            cursor.execute('''
                INSERT INTO bookings (
                    user_id, location_address, gps_link, property_type, indoor_outdoor,
                    area_size, area_unit, rooms_sections, num_floors,
                    preferred_date, preferred_time, special_requirements, drone_permissions_required,
                    base_package_cost, total_cost, custom_quote,
                    status, payment_status,
                    admin_comments, description,
                    referral_id,
                    pilot_earnings, editor_earnings, referral_earnings, hmx_earnings, gateway_fees
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            ''', (
                (
    client_user_id,
    data['location_address'],
    data['gps_link'],
    data['property_type'],
    data['indoor_outdoor'],
    data['area_size'],
    data['area_unit'],
    data['rooms_sections'],
    data['num_floors'],
    data['preferred_date'],
    data['preferred_time'],
    data.get('special_requirements',''),
    data.get('drone_permissions_required',0),
    base_cost,
    total_cost,
    (data.get('custom_quote','') if (str(data.get('custom_quote','')).strip()) else ('Custom Quote' if area_sqft > 50000 else '')),
    'REQUESTED',
    'ESCROW',
    data.get('admin_comments',''),
    data.get('description',''),
    data.get('referral_id'),
    earn['pilot_earnings'],
    earn['editor_earnings'],
    earn['referral_earnings'],
    earn['hmx_earnings'],
    earn['gateway_fees']
    )

            ))

            conn.commit()
            booking_id = cursor.lastrowid
            conn.close()

            # Notify client (not admin!) about booking creation
            send_email_with_template_helper(
                to_email=client_email,
                template_name="order_created",
                variables={
                    "name": client_name,
                    "booking_id": booking_id,
                    "location": data['location_address'],
                    "date": data['preferred_date']
                }
            )

            return jsonify({
                'message': 'Booking created successfully',
                'booking_id': booking_id,
                'base_cost': base_cost,
                'final_cost': final_cost,
                'total_cost': total_cost,
                'earnings': earn
            }), 201

        except sqlite3.Error as e:
            import traceback
            print(traceback.format_exc())
            return jsonify({'message': f'Database error: {str(e)}'}), 500
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return jsonify({'message': f'Failed to create booking: {str(e)}'}), 500

    # --- GET BOOKINGS ---
    print("\n=== Fetching Bookings ===")
    try:
        conn = get_db()
        cursor = conn.cursor()

        if current_user['role'] == 'admin':
            cursor.execute('''
                SELECT b.*, 
                       bc.business_name, u.username as contact_name, u.email as client_email,
                       p.name as pilot_name, p.email as pilot_email
                FROM bookings b
                LEFT JOIN users u ON b.user_id = u.id
                LEFT JOIN business_clients bc ON u.email = bc.email
                LEFT JOIN pilots p ON b.pilot_id = p.id
                ORDER BY b.created_at DESC
            ''')
        elif current_user['role'] == 'pilot':
            cursor.execute('''
                SELECT b.*, 
                       bc.business_name, u.username as contact_name, u.email as client_email,
                       CASE 
                           WHEN b.pilot_id = ? THEN 'assigned'
                           WHEN b.status = 'REQUESTED' THEN 'available'
                           ELSE 'unavailable'
                       END as booking_status
                FROM bookings b
                LEFT JOIN users u ON b.user_id = u.id
                LEFT JOIN business_clients bc ON u.email = bc.email
                WHERE b.status = 'REQUESTED' OR b.pilot_id = ?
                ORDER BY b.created_at DESC
            ''', (current_user.get('id', current_user.get('user_id')), current_user.get('id', current_user.get('user_id'))))
        else:
            cursor.execute('''
                SELECT b.*, 
                       p.name as pilot_name, p.email as pilot_email
                FROM bookings b
                LEFT JOIN pilots p ON b.pilot_id = p.id
                WHERE b.user_id = ?
                ORDER BY b.created_at DESC
            ''', (get_actor_id(current_user),))

        bookings = cursor.fetchall()
        conn.close()
        return jsonify([dict(booking) for booking in bookings])

    except Exception as e:
        print(f"Error fetching bookings: {str(e)}")
        return jsonify({'message': 'Failed to fetch bookings'}), 500


@app.route('/api/bookings/<int:booking_id>/claim', methods=['POST'])
@app.route('/api/bookings/<int:booking_id>/accept', methods=['POST'])
@token_required
def claim_booking(current_user, booking_id):
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Only pilots can claim bookings'}), 403
        
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, pilot_id, status FROM bookings WHERE id = ?', (booking_id,))
        booking = cursor.fetchone()

        if not booking:
            conn.close()
            return jsonify({'message': 'Booking not found'}), 404

        current_status = normalize_booking_status(booking['status'])
        if not can_transition(current_status, 'PILOT_ASSIGNED'):
            conn.close()
            return jsonify({'error': 'Invalid status transition'}), 400

        # Atomic assignment prevents two pilots claiming the same booking concurrently.
        pilot_id = get_actor_id(current_user)
        cursor.execute(
            '''
            UPDATE bookings
            SET pilot_id = ?, status = 'PILOT_ASSIGNED', updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND pilot_id IS NULL AND status = 'REQUESTED'
            ''',
            (pilot_id, booking_id),
        )

        if cursor.rowcount == 0:
            conn.rollback()
            conn.close()
            return jsonify({'message': 'Booking was already claimed'}), 409
            
        conn.commit()
        print(f"Booking {booking_id} claimed by pilot {pilot_id}")
        emit_booking_notification(
            socketio,
            booking_id,
            'PILOT_ACCEPTED',
            {'pilot_id': pilot_id, 'notify': ['client']},
        )
        conn.close()
        
        return jsonify({'message': 'Booking claimed successfully'})
    except Exception as e:
        print(f"Error claiming booking: {str(e)}")
        return jsonify({'message': 'Failed to claim booking'}), 500


@app.route('/api/bookings/<int:booking_id>/pilot-cancel', methods=['POST'])
@token_required
def pilot_cancel_booking(current_user, booking_id):
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Only pilots can cancel accepted bookings'}), 403

    conn = get_db()
    cursor = conn.cursor()
    try:
        pilot_id = get_actor_id(current_user)
        cursor.execute('SELECT id, pilot_id, status FROM bookings WHERE id = ?', (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            conn.close()
            return jsonify({'message': 'Booking not found'}), 404

        if booking['pilot_id'] != pilot_id:
            conn.close()
            return jsonify({'message': 'Unauthorized'}), 403

        if normalize_booking_status(booking['status']) != 'PILOT_ASSIGNED':
            conn.close()
            return jsonify({'message': 'Only accepted bookings can be cancelled by pilot'}), 400

        # Explicit requeue path for pilot cancellation edge case.
        cursor.execute(
            '''
            UPDATE bookings
            SET pilot_id = NULL, status = 'REQUESTED', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            ''',
            (booking_id,),
        )
        conn.commit()
        emit_booking_notification(socketio, booking_id, 'PILOT_CANCELLED_REASSIGN', {'notify': ['admin', 'client']})
        conn.close()
        return jsonify({'message': 'Booking returned to REQUESTED for reassignment'})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'message': f'Failed to cancel booking: {str(e)}'}), 500


@app.route('/api/bookings/<int:booking_id>/upload-footage', methods=['POST'])
@token_required
def upload_booking_footage(current_user, booking_id):
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Only pilots can upload footage'}), 403

    data = request.get_json() or {}
    raw_video_url = data.get('rawVideoUrl') or data.get('raw_video_url')
    if not raw_video_url:
        return jsonify({'message': 'rawVideoUrl is required'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor()
        pilot_id = get_actor_id(current_user)

        cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            conn.close()
            return jsonify({'message': 'Booking not found'}), 404

        if booking['pilot_id'] != pilot_id:
            conn.close()
            return jsonify({'message': 'Unauthorized'}), 403

        current_status = normalize_booking_status(booking['status'])
        if not can_transition(current_status, 'SHOOT_COMPLETED'):
            conn.close()
            return jsonify({'error': 'Invalid status transition'}), 400

        cursor.execute(
            'UPDATE bookings SET raw_video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (raw_video_url, booking_id),
        )
        transition_booking(cursor, booking_id, current_status, 'SHOOT_COMPLETED')

        editor_id = booking['editor_id']
        if editor_id:
            transition_booking(cursor, booking_id, 'SHOOT_COMPLETED', 'EDITING')

        conn.commit()
        emit_booking_notification(
            socketio,
            booking_id,
            'FOOTAGE_UPLOADED',
            {'editor_id': editor_id, 'notify': ['editor']},
        )
        conn.close()
        if not editor_id:
            return jsonify({'message': 'Footage uploaded. Awaiting editor assignment before editing starts.'})

        return jsonify({'message': 'Footage uploaded successfully', 'editor_id': editor_id})
    except BookingLifecycleError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"Error uploading footage: {str(e)}")
        return jsonify({'message': 'Failed to upload footage'}), 500


@app.route('/api/bookings/<int:booking_id>/assign-editor', methods=['POST'])
@token_required
def assign_booking_editor(current_user, booking_id):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Only admin can assign editor'}), 403

    data = request.get_json() or {}
    editor_id = data.get('editor_id')
    if not editor_id:
        return jsonify({'message': 'editor_id is required'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            conn.close()
            return jsonify({'message': 'Booking not found'}), 404

        cursor.execute('SELECT id FROM editors WHERE id = ? AND status = "active"', (editor_id,))
        editor = cursor.fetchone()
        if not editor:
            conn.close()
            return jsonify({'message': 'Editor not found or inactive'}), 404

        current_status = normalize_booking_status(booking['status'])
        if not can_transition(current_status, 'EDITING'):
            conn.close()
            return jsonify({'error': 'Invalid status transition'}), 400

        cursor.execute(
            'UPDATE bookings SET editor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (editor_id, booking_id),
        )
        transition_booking(cursor, booking_id, current_status, 'EDITING')
        conn.commit()
        emit_booking_notification(
            socketio,
            booking_id,
            'EDITOR_ASSIGNED',
            {'editor_id': editor_id, 'notify': ['editor']},
        )
        conn.close()
        return jsonify({'message': 'Editor assigned successfully'})
    except Exception as e:
        print(f"Error assigning editor: {str(e)}")
        return jsonify({'message': 'Failed to assign editor'}), 500


@app.route('/api/bookings/<int:booking_id>/submit-edit', methods=['POST'])
@token_required
def submit_booking_edit(current_user, booking_id):
    if current_user['role'] != 'editor':
        return jsonify({'message': 'Only editors can submit edits'}), 403

    data = request.get_json() or {}
    edited_url = data.get('url') or data.get('drive_link')
    if not edited_url:
        return jsonify({'message': 'Edited video URL is required'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor()
        editor_id = get_actor_id(current_user)

        cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            conn.close()
            return jsonify({'message': 'Booking not found'}), 404

        if booking['editor_id'] != editor_id:
            conn.close()
            return jsonify({'message': 'Unauthorized'}), 403

        current_status = normalize_booking_status(booking['status'])
        if not can_transition(current_status, 'EDIT_SUBMITTED'):
            conn.close()
            return jsonify({'error': 'Invalid status transition'}), 400

        append_edited_version(cursor, dict(booking), edited_url)
        cursor.execute(
            'UPDATE bookings SET delivery_video_link = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (edited_url, booking_id),
        )
        transition_booking(cursor, booking_id, current_status, 'EDIT_SUBMITTED')
        set_auto_approval_deadline(cursor, booking_id, days=3)
        conn.commit()
        emit_booking_notification(socketio, booking_id, 'EDIT_SUBMITTED', {'notify': ['client']})
        conn.close()
        return jsonify({'message': 'Edited video submitted successfully'})
    except Exception as e:
        print(f"Error submitting edit: {str(e)}")
        return jsonify({'message': 'Failed to submit edit'}), 500


@app.route('/api/bookings/<int:booking_id>/approve', methods=['POST'])
@token_required
def approve_booking_edit(current_user, booking_id):
    if current_user['role'] != 'client':
        return jsonify({'message': 'Only client can approve edits'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            conn.close()
            return jsonify({'message': 'Booking not found'}), 404

        if booking['user_id'] != get_actor_id(current_user):
            conn.close()
            return jsonify({'message': 'Unauthorized'}), 403

        current_status = normalize_booking_status(booking['status'])
        if not can_transition(current_status, 'APPROVED'):
            conn.close()
            return jsonify({'error': 'Invalid status transition'}), 400

        transition_booking(cursor, booking_id, current_status, 'APPROVED')
        booking_payload = dict(booking)
        booking_payload['status'] = 'APPROVED'
        distribution = distribute_payment(booking_payload)
        cursor.execute(
            '''
            UPDATE bookings
            SET pilot_earnings = ?, editor_earnings = ?, hmx_earnings = ?, payment_split_status = ?, payment_status = ?, amount = COALESCE(amount, payment_amount, total_cost), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            ''',
            (
                distribution['pilot_share'],
                distribution['editor_share'],
                distribution['platform_share'],
                distribution['transfer_status'],
                'RELEASED',
                booking_id,
            ),
        )

        transition_booking(cursor, booking_id, 'APPROVED', 'COMPLETED')
        conn.commit()
        emit_booking_notification(socketio, booking_id, 'APPROVED', {'notify': ['client', 'pilot', 'editor']})
        conn.close()
        return jsonify({'message': 'Booking approved and completed', 'distribution': distribution})
    except BookingLifecycleError as e:
        return jsonify({'error': str(e)}), 400
    except PaymentDistributionError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"Error approving booking: {str(e)}")
        return jsonify({'message': 'Failed to approve booking'}), 500


@app.route('/api/bookings/<int:booking_id>/revision', methods=['POST'])
@token_required
def request_booking_revision(current_user, booking_id):
    if current_user['role'] != 'client':
        return jsonify({'message': 'Only client can request revision'}), 403

    data = request.get_json() or {}
    reason = data.get('reason', '').strip()

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            conn.close()
            return jsonify({'message': 'Booking not found'}), 404

        if booking['user_id'] != get_actor_id(current_user):
            conn.close()
            return jsonify({'message': 'Unauthorized'}), 403

        current_status = normalize_booking_status(booking['status'])
        if not can_transition(current_status, 'REVISION_REQUESTED'):
            conn.close()
            return jsonify({'error': 'Invalid status transition'}), 400

        append_revision_history(cursor, dict(booking), reason)
        transition_booking(cursor, booking_id, current_status, 'REVISION_REQUESTED')
        conn.commit()
        emit_booking_notification(
            socketio,
            booking_id,
            'REVISION_REQUESTED',
            {'reason': reason, 'notify': ['editor']},
        )
        conn.close()
        return jsonify({'message': 'Revision requested'})
    except BookingLifecycleError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"Error requesting revision: {str(e)}")
        return jsonify({'message': 'Failed to request revision'}), 500


@app.route('/api/bookings/<int:booking_id>/start-revision', methods=['POST'])
@token_required
def start_booking_revision(current_user, booking_id):
    if current_user['role'] != 'editor':
        return jsonify({'message': 'Only editors can start revision editing'}), 403

    conn = get_db()
    cursor = conn.cursor()
    try:
        editor_id = get_actor_id(current_user)
        cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            conn.close()
            return jsonify({'message': 'Booking not found'}), 404

        if booking['editor_id'] != editor_id:
            conn.close()
            return jsonify({'message': 'Unauthorized'}), 403

        current_status = normalize_booking_status(booking['status'])
        transition_booking(cursor, booking_id, current_status, 'EDITING')
        conn.commit()
        emit_booking_notification(socketio, booking_id, 'REVISION_EDITING_STARTED', {'notify': ['client', 'editor']})
        conn.close()
        return jsonify({'message': 'Revision moved back to editing'})
    except BookingLifecycleError as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'message': f'Failed to start revision editing: {str(e)}'}), 500


@app.route('/api/bookings/lifecycle/maintenance', methods=['POST'])
@token_required
def lifecycle_maintenance(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Only admin can run lifecycle maintenance'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()
        now = datetime.utcnow()

        # Pilot timeout: reset stale PILOT_ASSIGNED bookings for reassignment.
        cursor.execute(
            """
            SELECT id, updated_at FROM bookings
            WHERE status = 'PILOT_ASSIGNED' AND pilot_id IS NOT NULL
            """
        )
        stale_pilot = []
        for row in cursor.fetchall():
            updated_at = row['updated_at']
            try:
                updated_dt = datetime.fromisoformat(updated_at.replace('Z', '+00:00')).replace(tzinfo=None)
            except Exception:
                continue
            if (now - updated_dt).days >= 2:
                stale_pilot.append(row['id'])

        for booking_id in stale_pilot:
            cursor.execute(
                "UPDATE bookings SET pilot_id = NULL, status = 'REQUESTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (booking_id,),
            )
            emit_booking_notification(socketio, booking_id, 'PILOT_TIMEOUT_REASSIGN', {'notify': ['admin']})

        # Editor delay alert for long EDITING state.
        cursor.execute(
            """
            SELECT id, updated_at FROM bookings
            WHERE status = 'EDITING'
            """
        )
        delayed_editor = []
        for row in cursor.fetchall():
            updated_at = row['updated_at']
            try:
                updated_dt = datetime.fromisoformat(updated_at.replace('Z', '+00:00')).replace(tzinfo=None)
            except Exception:
                continue
            if (now - updated_dt).days >= 2:
                delayed_editor.append(row['id'])
                emit_booking_notification(socketio, row['id'], 'EDITOR_DELAY_ALERT', {'notify': ['admin']})

        # Auto-approve if client inactive after edit submission deadline.
        cursor.execute(
            """
            SELECT id, auto_approve_at, status FROM bookings
            WHERE status = 'EDIT_SUBMITTED' AND auto_approve_at IS NOT NULL
            """
        )
        auto_approved = []
        for row in cursor.fetchall():
            try:
                deadline = datetime.fromisoformat(row['auto_approve_at'].replace('Z', '+00:00')).replace(tzinfo=None)
            except Exception:
                continue
            if now >= deadline and can_transition('EDIT_SUBMITTED', 'APPROVED'):
                cursor.execute('SELECT * FROM bookings WHERE id = ?', (row['id'],))
                booking = cursor.fetchone()
                if not booking:
                    continue

                transition_booking(cursor, row['id'], 'EDIT_SUBMITTED', 'APPROVED')
                booking_payload = dict(booking)
                booking_payload['status'] = 'APPROVED'
                distribution = distribute_payment(booking_payload)
                cursor.execute(
                    '''
                    UPDATE bookings
                    SET pilot_earnings = ?, editor_earnings = ?, hmx_earnings = ?, payment_split_status = ?, payment_status = ?, amount = COALESCE(amount, payment_amount, total_cost), updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    ''',
                    (
                        distribution['pilot_share'],
                        distribution['editor_share'],
                        distribution['platform_share'],
                        distribution['transfer_status'],
                        'RELEASED',
                        row['id'],
                    ),
                )
                transition_booking(cursor, row['id'], 'APPROVED', 'COMPLETED')
                auto_approved.append(row['id'])
                emit_booking_notification(socketio, row['id'], 'AUTO_APPROVED', {'notify': ['client', 'editor', 'pilot']})

        conn.commit()
        conn.close()
        return jsonify(
            {
                'message': 'Lifecycle maintenance completed',
                'reassigned_bookings': stale_pilot,
                'editor_delay_alerts': delayed_editor,
                'auto_approved_bookings': auto_approved,
            }
        )
    except Exception as e:
        print(f"Lifecycle maintenance error: {str(e)}")
        return jsonify({'message': 'Lifecycle maintenance failed', 'error': str(e)}), 500

@app.route('/api/bookings/<int:booking_id>', methods=['PUT'])
@token_required
def update_booking(current_user, booking_id):
    data = request.json
    print(f"\n=== Updating Booking {booking_id} ===")
    print(f"Update data: {data}")
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if booking exists and user has permission
        cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
        booking = cursor.fetchone()
        
        if not booking:
            return jsonify({'message': 'Booking not found'}), 404
            
        if current_user['role'] == 'client' and booking['user_id'] != get_actor_id(current_user):
            return jsonify({'message': 'Unauthorized'}), 403

        if 'status' in data:
            return jsonify({'message': 'Direct status updates are not allowed on this endpoint'}), 400
            
        # Update booking based on user role
        if current_user['role'] == 'admin':
            cursor.execute('''
                UPDATE bookings 
                SET pilot_notes = ?, client_notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (data.get('pilot_notes'), data.get('client_notes'), booking_id))
        elif current_user['role'] == 'pilot':
            pilot_id = get_actor_id(current_user)
            if booking['pilot_id'] != pilot_id:
                return jsonify({'message': 'Unauthorized'}), 403
            cursor.execute('''
                UPDATE bookings
                SET pilot_notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND pilot_id = ?
            ''', (data.get('pilot_notes'), booking_id, pilot_id))
        else:
            cursor.execute('''
                UPDATE bookings 
                SET client_notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            ''', (data.get('client_notes'), booking_id, get_actor_id(current_user)))
            
        conn.commit()
        print("Booking updated successfully")
        conn.close()
        
        return jsonify({'message': 'Booking updated successfully'})
    except Exception as e:
        print(f"Error updating booking: {str(e)}")
        return jsonify({'message': 'Failed to update booking'}), 500

@app.route('/api/bookings/<int:booking_id>', methods=['DELETE'])
@token_required
def delete_booking(current_user, booking_id):
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Fetch booking
        cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
        booking = cursor.fetchone()

        if not booking:
            conn.close()
            return jsonify({'message': 'Booking not found'}), 404

        # Permission checks: clients can delete their own, admins can delete; others forbidden
        if current_user['role'] == 'client':
            if booking['user_id'] != get_actor_id(current_user):
                conn.close()
                return jsonify({'message': 'Unauthorized'}), 403
        elif current_user['role'] != 'admin':
            conn.close()
            return jsonify({'message': 'Unauthorized'}), 403

        # Business rule: allow delete only if no pilot assigned and not started/completed
        if booking['pilot_id'] is not None:
            conn.close()
            return jsonify({'message': 'Cannot delete booking: pilot already assigned'}), 400
        if normalize_booking_status(booking['status']) != 'REQUESTED':
            conn.close()
            return jsonify({'message': f"Cannot delete booking in status '{booking['status']}'"}), 400

        cursor.execute('DELETE FROM bookings WHERE id = ?', (booking_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Booking deleted successfully'})
    except Exception as e:
        print(f"Error deleting booking: {str(e)}")
        return jsonify({'message': 'Failed to delete booking'}), 500

@app.route('/api/bookings/<int:booking_id>/complete', methods=['POST'])
@token_required
def complete_booking(current_user, booking_id):
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Only pilots can complete bookings'}), 403
        
    data = request.json
    if not data.get('drive_link'):
        return jsonify({'message': 'Drive link is required to upload footage'}), 400
        
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Legacy alias for upload-footage
        pilot_id = get_actor_id(current_user)
        cursor.execute('SELECT * FROM bookings WHERE id = ? AND pilot_id = ?', (booking_id, pilot_id))
        booking = cursor.fetchone()
        
        if not booking:
            conn.close()
            return jsonify({'message': 'Booking not found'}), 404

        current_status = normalize_booking_status(booking['status'])
        if not can_transition(current_status, 'SHOOT_COMPLETED'):
            conn.close()
            return jsonify({'error': 'Invalid status transition'}), 400

        cursor.execute(
            '''
            UPDATE bookings
            SET raw_video_url = ?, drive_link = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND pilot_id = ?
            ''',
            (data['drive_link'], data['drive_link'], booking_id, pilot_id),
        )
        transition_booking(cursor, booking_id, current_status, 'SHOOT_COMPLETED')
        
        conn.commit()
        print(f"Booking {booking_id} footage uploaded by pilot {pilot_id}")
        conn.close()
        
        return jsonify({'message': 'Footage uploaded successfully'})
    except Exception as e:
        print(f"Error completing booking: {str(e)}")
        return jsonify({'message': 'Failed to complete booking'}), 500

@app.route('/api/bookings/<int:booking_id>/payment', methods=['POST'])
@token_required
def process_payment(current_user, booking_id):
    return jsonify({'message': 'Direct booking payment endpoint is deprecated. Use /api/payment/initiate.'}), 410

@app.route('/api/bookings/<int:booking_id>/start', methods=['POST'])
@token_required
def start_booking(current_user, booking_id):
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Only pilots can start bookings'}), 403
        
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if booking exists and is assigned to this pilot
        pilot_id = get_actor_id(current_user)
        cursor.execute('''
            SELECT * FROM bookings
            WHERE id = ? AND pilot_id = ?
        ''', (booking_id, pilot_id))
        booking = cursor.fetchone()
        
        if not booking:
            return jsonify({'message': 'Booking not found or not assigned'}), 404

        current_status = normalize_booking_status(booking['status'])
        if current_status != 'PILOT_ASSIGNED':
            conn.close()
            return jsonify({'error': 'Invalid status transition'}), 400

        conn.close()
        print(f"Booking {booking_id} started by pilot {pilot_id}")
        
        return jsonify({'message': 'Booking started successfully'})
    except Exception as e:
        print(f"Error starting booking: {str(e)}")
        return jsonify({'message': 'Failed to start booking'}), 500

# Client Profile Update
@app.route('/api/clients/profile', methods=['PUT'])
@token_required
def update_client_profile(current_user):
    if current_user['role'] != 'client':
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()
    required_fields = ['business_name', 'contact_name', 'phone']
    
    # Validate required fields
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Update client profile
        cursor.execute('''
            UPDATE clients 
            SET business_name = ?, contact_name = ?, phone = ?
            WHERE user_id = ?
        ''', (data['business_name'], data['contact_name'], data['phone'], current_user['id']))

        # Update users table for contact name
        cursor.execute('''
            UPDATE users 
            SET contact_name = ?
            WHERE id = ?
        ''', (data['contact_name'], current_user['id']))

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Profile updated successfully',
            'business_name': data['business_name'],
            'contact_name': data['contact_name'],
            'phone': data['phone']
        }), 200

    except Exception as e:
        print(f"Error updating client profile: {str(e)}")
        return jsonify({'message': 'Failed to update profile'}), 500

# Client Password Update
@app.route('/api/clients/password', methods=['PUT'])
@token_required
def update_client_password(current_user):
    if current_user['role'] != 'client':
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()
    required_fields = ['current_password', 'new_password']
    
    # Validate required fields
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get current user's password hash
        cursor.execute('SELECT password_hash FROM users WHERE id = ?', (current_user['id'],))
        user = cursor.fetchone()

        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Verify current password
        if not verify_password(data['current_password'], user['password_hash']):
            return jsonify({'message': 'Current password is incorrect'}), 400

        # Hash new password
        new_password_hash = generate_password_hash(data['new_password'])

        # Update password
        cursor.execute('''
            UPDATE users 
            SET password_hash = ?
            WHERE id = ?
        ''', (new_password_hash, current_user['id']))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Password updated successfully'}), 200

    except Exception as e:
        print(f"Error updating client password: {str(e)}")
        return jsonify({'message': 'Failed to update password'}), 500

# Client Account Deletion
@app.route('/api/clients/account', methods=['DELETE'])
@token_required
def delete_client_account(current_user):
    if current_user['role'] != 'client':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Start transaction
        cursor.execute('BEGIN TRANSACTION')

        try:
            # Delete client's bookings
            cursor.execute('DELETE FROM bookings WHERE client_id = ?', (current_user['id'],))

            # Delete client record
            cursor.execute('DELETE FROM clients WHERE user_id = ?', (current_user['id'],))

            # Delete user record
            cursor.execute('DELETE FROM users WHERE id = ?', (current_user['id'],))

            # Commit transaction
            cursor.execute('COMMIT')
            conn.close()

            return jsonify({'message': 'Account deleted successfully'}), 200

        except Exception as e:
            # Rollback transaction on error
            cursor.execute('ROLLBACK')
            raise e

    except Exception as e:
        print(f"Error deleting client account: {str(e)}")
        return jsonify({'message': 'Failed to delete account'}), 500

@app.route('/api/clients/bookings', methods=['GET'])
@token_required
def get_client_bookings(current_user):
    if current_user['role'] != 'client':
        return jsonify({'message': 'Unauthorized'}), 403
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, brand_name, guest_name, property_type, location_address,
                   area_size, business_size, preferred_date, preferred_time,
                   total_cost, status, payment_status, created_at,
                   special_requirements, company_name, num_floors, referral_code
            FROM bookings
            WHERE user_id = ? AND booking_category = 'business'
            ORDER BY created_at DESC
        """, (current_user['id'],))
        rows = cursor.fetchall()
        bookings = [dict(r) for r in rows]
        conn.close()

        active = sum(
            1
            for b in bookings
            if normalize_booking_status(b['status'])
            in ('REQUESTED', 'PILOT_ASSIGNED', 'SHOOT_COMPLETED', 'EDITING', 'EDIT_SUBMITTED', 'REVISION_REQUESTED', 'APPROVED')
        )
        completed = sum(1 for b in bookings if normalize_booking_status(b['status']) == 'COMPLETED')
        pending_pay = sum(1 for b in bookings if (b['payment_status'] or '').upper() in ('PENDING', 'ESCROW'))
        total_spent = sum(b['total_cost'] or 0 for b in bookings if (b['payment_status'] or '').upper() in ('ESCROW', 'DISTRIBUTED', 'PAID'))

        return jsonify({
            'success': True,
            'bookings': bookings,
            'stats': {
                'activeProjects': active,
                'completedProjects': completed,
                'pendingPayments': pending_pay,
                'totalSpent': total_spent
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Helper function to verify password
def verify_password(password, password_hash):
    try:
        print(f"\n=== Password Verification ===")
        print(f"Password hash format: {password_hash[:20]}...")
        
        # Use werkzeug's password verification
        result = werkzeug.security.check_password_hash(password_hash, password)
        print(f"Password verification result: {result}")
        return result
            
    except Exception as e:
        print(f"Error verifying password: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return False

# Helper function to generate password hash
def generate_password_hash(password):
    # Use werkzeug's password hashing
    return werkzeug.security.generate_password_hash(password)

@app.route('/api/admin/users', methods=['GET'])
@token_required
def get_users(current_user):
    # Handle preflight request
    print("\n=== Admin Users Request ===")
    print(f"Requesting user role: {current_user['role']}")
    
    if current_user['role'] != 'admin':
        print("Unauthorized access attempt")
        response = jsonify({'message': 'Unauthorized'}), 403
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        conn = get_db()
        users = conn.execute('SELECT * FROM users').fetchall()
        conn.close()
        
        users_list = [dict(user) for user in users]
        print(f"Found {len(users_list)} users:")
        for user in users_list:
            print(f"- {user['email']} (Status: {user['approval_status']})")
        
        response = jsonify(users_list)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    except Exception as e:
        print(f"Error fetching users: {str(e)}")
        response = jsonify({'message': 'Error fetching users'}), 500
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

@app.route('/api/admin/users/<int:user_id>/approval', methods=['PUT'])
@token_required
def update_user_approval(current_user, user_id):
    # Handle preflight request
    print(f"\n=== Update User Approval ===")
    print(f"Requesting user role: {current_user['role']}")
    print(f"Target user ID: {user_id}")
    
    if current_user['role'] != 'admin':
        print("Unauthorized access attempt")
        response = jsonify({'message': 'Unauthorized'}), 403
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        data = request.get_json()
        if not data or 'approval_status' not in data:
            return jsonify({'error': 'approval_status is required'}), 400
        
        approval_status = data['approval_status']
        if approval_status not in ['pending', 'approved', 'rejected']:
            return jsonify({'error': 'Invalid approval status'}), 400
        
        conn = get_db()
        c = conn.cursor()
        
        # Check if user exists
        c.execute('SELECT id FROM users WHERE id = ?', (user_id,))
        if not c.fetchone():
            return jsonify({'error': 'User not found'}), 404
        
        # Update approval status
        c.execute('UPDATE users SET approval_status = ? WHERE id = ?', (approval_status, user_id))
        conn.commit()
        conn.close()
        
        print(f"User {user_id} approval status updated to: {approval_status}")
        
        response = jsonify({'message': f'User approval status updated to {approval_status}'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    except Exception as e:
        print(f"Error updating user approval: {str(e)}")
        response = jsonify({'message': 'Error updating user approval'}), 500
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

@app.route('/api/admin/pilots', methods=['GET', 'POST'])
@token_required
def manage_pilots(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    if request.method == 'POST':
        try:
            data = request.get_json()
            required_fields = ['name', 'email', 'phone', 'password']
            
            # Validate required fields
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400

            conn = get_db()
            c = conn.cursor()

            # Check if email already exists
            c.execute('SELECT id FROM pilots WHERE email = ?', (data['email'],))
            if c.fetchone():
                return jsonify({'error': 'Email already registered'}), 400

            # Hash password
            hashed_password = generate_password_hash(data['password'])

            # Insert new pilot
            c.execute('''
                INSERT INTO pilots (name, email, phone, password_hash, status)
                VALUES (?, ?, ?, ?, 'active')
            ''', (data['name'], data['email'], data['phone'], hashed_password))
            
            conn.commit()
            return jsonify({'message': 'Pilot added successfully'}), 201

        except Exception as e:
            print(f"Error adding pilot: {e}")
            return jsonify({'error': 'Internal server error'}), 500

    # GET method
    try:
        conn = get_db()
        c = conn.cursor()
        
        # Fetch pilots with error handling for each column
        c.execute('SELECT id, name, email, phone, status, created_at FROM pilots')
        pilots = c.fetchall()
        
        pilots_list = []
        for pilot in pilots:
            try:
                pilot_dict = {
                    'id': pilot[0],
                    'name': pilot[1],
                    'email': pilot[2],
                    'phone': pilot[3],
                    'status': pilot[4],
                    'created_at': pilot[5] if len(pilot) > 5 else None
                }
                pilots_list.append(pilot_dict)
            except Exception as e:
                print(f"Error processing pilot data: {e}")
                print(f"Problematic pilot data: {pilot}")
                continue

        print(f"Successfully fetched {len(pilots_list)} pilots")
        return jsonify(pilots_list)

    except Exception as e:
        print(f"Error fetching pilots: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/pilots/<int:pilot_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
def manage_pilot(current_user, pilot_id):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        if request.method == 'GET':
            c.execute('SELECT id, name, email, phone, status, created_at FROM pilots WHERE id = ?', (pilot_id,))
            pilot = c.fetchone()
            
            if not pilot:
                return jsonify({'error': 'Pilot not found'}), 404

            return jsonify({
                'id': pilot[0],
                'name': pilot[1],
                'email': pilot[2],
                'phone': pilot[3],
                'status': pilot[4],
                'created_at': pilot[5]
            })

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400

            # Check if pilot exists
            c.execute('SELECT id FROM pilots WHERE id = ?', (pilot_id,))
            if not c.fetchone():
                return jsonify({'error': 'Pilot not found'}), 404

            # Update pilot
            update_fields = []
            update_values = []
            
            if 'name' in data:
                update_fields.append('name = ?')
                update_values.append(data['name'])
            if 'email' in data:
                update_fields.append('email = ?')
                update_values.append(data['email'])
            if 'phone' in data:
                update_fields.append('phone = ?')
                update_values.append(data['phone'])
            if 'status' in data:
                update_fields.append('status = ?')
                update_values.append(data['status'])
            if 'password' in data:
                update_fields.append('password_hash = ?')
                update_values.append(generate_password_hash(data['password']))

            if not update_fields:
                return jsonify({'error': 'No valid fields to update'}), 400

            update_values.append(pilot_id)
            query = f'''
                UPDATE pilots 
                SET {', '.join(update_fields)}
                WHERE id = ?
            '''
            
            c.execute(query, update_values)
            conn.commit()
            
            return jsonify({'message': 'Pilot updated successfully'})

        elif request.method == 'DELETE':
            # Check if pilot exists
            c.execute('SELECT id FROM pilots WHERE id = ?', (pilot_id,))
            if not c.fetchone():
                return jsonify({'error': 'Pilot not found'}), 404

            # Delete pilot
            c.execute('DELETE FROM pilots WHERE id = ?', (pilot_id,))
            conn.commit()
            
            return jsonify({'message': 'Pilot deleted successfully'})

    except Exception as e:
        print(f"Error managing pilot: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/pilots/<int:pilot_id>/details', methods=['GET'])
@token_required
def get_pilot_details(current_user, pilot_id):
    """Get detailed information for a specific pilot"""
    try:
        conn = get_db()
        c = conn.cursor()

        # Get detailed pilot information
        c.execute('SELECT * FROM pilots WHERE id = ?', (pilot_id,))
        pilot = c.fetchone()
        conn.close()

        if not pilot:
            return jsonify({'message': 'Pilot not found'}), 404

        # Convert to dictionary
        pilot_dict = dict(pilot)

        response = jsonify(pilot_dict)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error fetching pilot details: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/admin/videos', methods=['GET'])
@token_required
def get_videos(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        conn = get_db()
        # Get videos with editor information
        videos = conn.execute('''
            SELECT v.*, e.name as editor_name, e.email as editor_email
            FROM videos v
            LEFT JOIN editors e ON v.editor_id = e.id
            ORDER BY v.created_at DESC
        ''').fetchall()
        conn.close()
        
        return jsonify([dict(video) for video in videos])
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/admin/videos/<int:video_id>', methods=['PUT'])
@token_required
def update_video(current_user, video_id):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        conn = get_db()
        
        # Update video with editor assignment support
        update_fields = []
        update_values = []
        
        if 'status' in data:
            update_fields.append('status = ?')
            update_values.append(data['status'])
        if 'review_notes' in data:
            update_fields.append('review_notes = ?')
            update_values.append(data['review_notes'])
        if 'editor_id' in data:
            update_fields.append('editor_id = ?')
            update_values.append(data['editor_id'])
        
        update_fields.append('updated_at = CURRENT_TIMESTAMP')
        update_values.append(video_id)
        
        query = f'''
            UPDATE videos 
            SET {', '.join(update_fields)}
            WHERE id = ?
        '''
        
        conn.execute(query, update_values)
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Video updated successfully'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/admin/videos/<int:video_id>/assign', methods=['POST'])
@token_required
def assign_editor_to_video(current_user, video_id):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        if not data or 'editor_id' not in data:
            return jsonify({'message': 'Editor ID is required'}), 400
        
        conn = get_db()
        
        # Check if video exists
        video = conn.execute('SELECT id FROM videos WHERE id = ?', (video_id,)).fetchone()
        if not video:
            conn.close()
            return jsonify({'message': 'Video not found'}), 404
        
        # Check if editor exists
        editor = conn.execute('SELECT id FROM editors WHERE id = ?', (data['editor_id'],)).fetchone()
        if not editor:
            conn.close()
            return jsonify({'message': 'Editor not found'}), 404
        
        # Assign editor to video
        conn.execute('''
            UPDATE videos 
            SET editor_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (data['editor_id'], video_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Editor assigned successfully'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# Public Referral Registration Endpoint
@app.route('/api/referrals/register', methods=['POST'])
def public_referral_register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data received'}), 400

        # Validate required fields
        required_fields = ['name', 'email', 'phone', 'password']
        missing = [f for f in required_fields if f not in data or not data[f]]
        if missing:
            return jsonify({'message': f'Missing required fields: {", ".join(missing)}'}), 400

        # Basic email validation
        if '@' not in data['email'] or '.' not in data['email']:
            return jsonify({'message': 'Invalid email format'}), 400

        # Validate password length
        if len(data['password']) < 6:
            return jsonify({'message': 'Password must be at least 6 characters long'}), 400

        conn = get_db()
        c = conn.cursor()

        # Check if email already exists in applications or main table
        c.execute('SELECT id FROM referral_applications WHERE email = ? AND status="pending"', (data['email'],))
        if c.fetchone():
            conn.close()
            return jsonify({'message': 'Application already submitted with this email'}), 400

        c.execute('SELECT id FROM referrals WHERE email = ?', (data['email'],))
        if c.fetchone():
            conn.close()
            return jsonify({'message': 'Email already registered'}), 400

        # Hash password
        password_hash = generate_password_hash(data['password'])

        # Add missing columns to referral_applications table if needed
        app_columns = [row[1] for row in c.execute("PRAGMA table_info(referral_applications)").fetchall()]
        alter_stmts = []
        if 'city' not in app_columns:
            alter_stmts.append("ALTER TABLE referral_applications ADD COLUMN city TEXT")
        if 'category' not in app_columns:
            alter_stmts.append("ALTER TABLE referral_applications ADD COLUMN category TEXT")
        if 'referral_source' not in app_columns:
            alter_stmts.append("ALTER TABLE referral_applications ADD COLUMN referral_source TEXT")
        if 'business_types' not in app_columns:
            alter_stmts.append("ALTER TABLE referral_applications ADD COLUMN business_types TEXT")
        if 'message' not in app_columns:
            alter_stmts.append("ALTER TABLE referral_applications ADD COLUMN message TEXT")
        if 'referral_code' not in app_columns:
            alter_stmts.append("ALTER TABLE referral_applications ADD COLUMN referral_code TEXT")
        if 'referral_link' not in app_columns:
            alter_stmts.append("ALTER TABLE referral_applications ADD COLUMN referral_link TEXT")
        for stmt in alter_stmts:
            try:
                c.execute(stmt)
            except Exception as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding column: {e}")

        # Generate unique referral code and link
        import uuid
        referral_code = str(uuid.uuid4())[:8]
        referral_link = f"https://hmx.in/ref/{referral_code}"

        # Insert into referral_applications table (pending approval)
        c.execute('''
            INSERT INTO referral_applications (
                name, email, phone, city, category, password_hash, referral_source, business_types, message,
                referral_code, referral_link, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        ''', (
            data['name'],
            data['email'],
            data['phone'],
            data.get('city', ''),
            data.get('category', ''),
            password_hash,
            data.get('referral_source', ''),
            data.get('business_types', ''),
            data.get('message', ''),
            referral_code,
            referral_link
        ))
        conn.commit()
        application_id = c.lastrowid
        conn.close()

        response = jsonify({
            'message': 'Referral application submitted successfully. Please wait for admin approval.',
            'application_id': application_id,
            'referral_link': referral_link
        })
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 201
    except Exception as e:
        print(f"Error in public_referral_register: {str(e)}")
        response = jsonify({'message': 'Internal server error'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/admin/referrals', methods=['GET', 'POST'])
@token_required
def manage_referrals(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    if request.method == 'POST':
        try:
            data = request.get_json()
            required_fields = ['name', 'email', 'phone']
            
            # Validate required fields
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400

            conn = get_db()
            c = conn.cursor()

            # Insert new referral
            c.execute('''
                INSERT INTO referrals (
                    name, email, phone, status
                )
                VALUES (?, ?, ?, 'pending')
            ''', (
                data['name'], data['email'], data['phone']
            ))
            
            conn.commit()
            conn.close()
            return jsonify({'message': 'Referral added successfully'}), 201

        except Exception as e:
            print(f"Error adding referral: {e}")
            return jsonify({'error': 'Internal server error'}), 500

    # GET method
    try:
        conn = get_db()
        c = conn.cursor()
        
        # Fetch referrals
        c.execute('''
            SELECT id, name, email, phone, status, commission_rate, total_earnings, created_at
            FROM referrals
            ORDER BY created_at DESC
        ''')
        referrals = c.fetchall()
        
        referrals_list = []
        for referral in referrals:
            try:
                referral_dict = {
                    'id': referral[0],
                    'name': referral[1],
                    'email': referral[2],
                    'phone': referral[3],
                    'status': referral[4],
                    'commission_rate': referral[5],
                    'total_earnings': referral[6],
                    'created_at': referral[7]
                }
                referrals_list.append(referral_dict)
            except Exception as e:
                print(f"Error processing referral data: {e}")
                print(f"Problematic referral data: {referral}")
                continue

        conn.close()
        print(f"Successfully fetched {len(referrals_list)} referrals")
        return jsonify(referrals_list)

    except Exception as e:
        print(f"Error fetching referrals: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/referrals/<int:referral_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
def manage_referral(current_user, referral_id):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        if request.method == 'GET':
            c.execute('SELECT * FROM referrals WHERE id = ?', (referral_id,))
            referral = c.fetchone()
            
            if not referral:
                conn.close()
                return jsonify({'error': 'Referral not found'}), 404

            conn.close()
            return jsonify({
                'id': referral[0],
                'name': referral[1],
                'email': referral[2],
                'phone': referral[3],
                'status': referral[4],
                'commission_rate': referral[5],
                'total_earnings': referral[6],
                'created_at': referral[7]
            })

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                conn.close()
                return jsonify({'error': 'No data provided'}), 400

            # Check if referral exists
            c.execute('SELECT id FROM referrals WHERE id = ?', (referral_id,))
            if not c.fetchone():
                conn.close()
                return jsonify({'error': 'Referral not found'}), 404

            # Update referral
            update_fields = []
            update_values = []
            
            fields = [
                'name', 'email', 'phone', 'status', 'commission_rate', 'total_earnings'
            ]
            
            for field in fields:
                if field in data:
                    update_fields.append(f'{field} = ?')
                    update_values.append(data[field])

            if not update_fields:
                conn.close()
                return jsonify({'error': 'No valid fields to update'}), 400

            update_values.append(referral_id)
            query = f'''
                UPDATE referrals 
                SET {', '.join(update_fields)}
                WHERE id = ?
            '''
            
            c.execute(query, update_values)
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Referral updated successfully'})

        elif request.method == 'DELETE':
            # Check if referral exists
            c.execute('SELECT id FROM referrals WHERE id = ?', (referral_id,))
            if not c.fetchone():
                conn.close()
                return jsonify({'error': 'Referral not found'}), 404

            # Delete referral
            c.execute('DELETE FROM referrals WHERE id = ?', (referral_id,))
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Referral deleted successfully'})

    except Exception as e:
        print(f"Error managing referral: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/editors', methods=['GET', 'POST'])
@token_required
def manage_editors(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    if request.method == 'POST':
        try:
            data = request.get_json()
            required_fields = ['name', 'email', 'phone', 'password']
            
            # Validate required fields
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400

            conn = get_db()
            c = conn.cursor()

            # Check if email already exists
            c.execute('SELECT id FROM editors WHERE email = ?', (data['email'],))
            if c.fetchone():
                return jsonify({'error': 'Email already registered'}), 400

            # Hash password
            hashed_password = generate_password_hash(data['password'])

            # Insert new editor
            c.execute('''
                INSERT INTO editors (name, email, phone, password_hash, status)
                VALUES (?, ?, ?, ?, 'active')
            ''', (data['name'], data['email'], data['phone'], hashed_password))
            
            conn.commit()
            conn.close()
            return jsonify({'message': 'Editor added successfully'}), 201

        except Exception as e:
            print(f"Error adding editor: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            try:
                conn.close()
            except:
                pass
            return jsonify({'error': 'Internal server error'}), 500

    # GET method
    try:
        conn = get_db()
        c = conn.cursor()
        
        # First, let's check what columns exist in the editors table
        c.execute("PRAGMA table_info(editors)")
        columns_info = c.fetchall()
        print(f"Editors table columns: {[col[1] for col in columns_info]}")
        
        # Fetch editors with error handling for each column
        c.execute('SELECT id, name, email, phone, status, created_at FROM editors')
        editors = c.fetchall()
        
        editors_list = []
        for editor in editors:
            try:
                editor_dict = {
                    'id': editor[0],
                    'name': editor[1],
                    'email': editor[2],
                    'phone': editor[3],
                    'status': editor[4],
                    'created_at': editor[5] if len(editor) > 5 else None
                }
                editors_list.append(editor_dict)
            except Exception as e:
                print(f"Error processing editor data: {e}")
                print(f"Problematic editor data: {editor}")
                continue

        print(f"Successfully fetched {len(editors_list)} editors")
        conn.close()
        return jsonify(editors_list)

    except Exception as e:
        print(f"Error fetching editors: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        try:
            conn.close()
        except:
            pass
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/editors/<int:editor_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
def manage_editor(current_user, editor_id):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        if request.method == 'GET':
            c.execute('SELECT id, name, email, phone, status, created_at FROM editors WHERE id = ?', (editor_id,))
            editor = c.fetchone()
            
            if not editor:
                return jsonify({'error': 'Editor not found'}), 404

            return jsonify({
                'id': editor[0],
                'name': editor[1],
                'email': editor[2],
                'phone': editor[3],
                'status': editor[4],
                'created_at': editor[5]
            })

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400

            # Check if editor exists
            c.execute('SELECT id FROM editors WHERE id = ?', (editor_id,))
            if not c.fetchone():
                return jsonify({'error': 'Editor not found'}), 404

            # Update editor
            update_fields = []
            update_values = []
            
            if 'name' in data:
                update_fields.append('name = ?')
                update_values.append(data['name'])
            if 'email' in data:
                update_fields.append('email = ?')
                update_values.append(data['email'])
            if 'phone' in data:
                update_fields.append('phone = ?')
                update_values.append(data['phone'])
            if 'status' in data:
                update_fields.append('status = ?')
                update_values.append(data['status'])

            if not update_fields:
                return jsonify({'error': 'No valid fields to update'}), 400

            update_values.append(editor_id)
            query = f'''
                UPDATE editors 
                SET {', '.join(update_fields)}
                WHERE id = ?
            '''
            
            c.execute(query, update_values)
            conn.commit()
            
            return jsonify({'message': 'Editor updated successfully'})

        elif request.method == 'DELETE':
            # Check if editor exists
            c.execute('SELECT id FROM editors WHERE id = ?', (editor_id,))
            if not c.fetchone():
                return jsonify({'error': 'Editor not found'}), 404

            # Delete editor
            c.execute('DELETE FROM editors WHERE id = ?', (editor_id,))
            conn.commit()
            
            return jsonify({'message': 'Editor deleted successfully'})

    except Exception as e:
        print(f"Error managing editor: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/editors/<int:editor_id>/details', methods=['GET'])
@token_required
def get_editor_details(current_user, editor_id):
    """Get detailed information for a specific editor"""
    try:
        conn = get_db()
        c = conn.cursor()

        # Get detailed editor information
        c.execute('SELECT * FROM editors WHERE id = ?', (editor_id,))
        editor = c.fetchone()
        conn.close()

        if not editor:
            return jsonify({'message': 'Editor not found'}), 404

        # Convert to dictionary
        editor_dict = dict(editor)

        response = jsonify(editor_dict)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error fetching editor details: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/admin/inquiries', methods=['GET', 'PUT'])
@token_required
def manage_inquiries(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    if request.method == 'GET':
        try:
            conn = get_db()
            inquiries = conn.execute('SELECT * FROM inquiries ORDER BY created_at DESC').fetchall()
            conn.close()
            
            return jsonify([dict(inquiry) for inquiry in inquiries])
        except Exception as e:
            return jsonify({'message': str(e)}), 500
    
    elif request.method == 'PUT':
        try:
            data = request.get_json()
            conn = get_db()
            
            conn.execute('''
                UPDATE inquiries 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (data['status'], data['id']))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Inquiry updated successfully'})
        except Exception as e:
            return jsonify({'message': str(e)}), 500

@app.route('/api/admin/payments', methods=['GET'])
@token_required
def get_payments(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Get all payments with a simplified query
        cursor.execute('''
            SELECT 
                p.id,
                p.booking_id,
                p.amount,
                p.status,
                COALESCE(p.payment_method, 'phonepe') as payment_method,
                COALESCE(p.merchant_transaction_id, '') as transaction_id,
                p.created_at,
                p.updated_at
            FROM payments p
            ORDER BY p.created_at DESC
        ''')
        
        payments = cursor.fetchall()
        
        # Build response with additional info
        payments_list = []
        for payment in payments:
            payment_dict = dict(payment)
            booking_id = payment_dict.get('booking_id')
            
            # Set defaults
            payment_dict['industry'] = ''
            payment_dict['location'] = ''
            payment_dict['client_name'] = ''
            payment_dict['client_company'] = ''
            payment_dict['client_email'] = ''
            payment_dict['client_phone'] = ''
            payment_dict['pilot_name'] = ''
            payment_dict['pilot_email'] = ''
            payment_dict['pilot_phone'] = ''
            payment_dict['referral_name'] = ''
            payment_dict['referral_email'] = ''
            
            # Get booking details
            if booking_id:
                cursor.execute('SELECT user_id, pilot_id, referral_id, property_type FROM bookings WHERE id = ?', (booking_id,))
                booking = cursor.fetchone()
                if booking:
                    booking_data = dict(booking)
                    payment_dict['industry'] = booking_data.get('property_type', '')
                    
                    # Get client info
                    if booking_data.get('user_id'):
                        cursor.execute('SELECT username, email FROM users WHERE id = ?', (booking_data['user_id'],))
                        user = cursor.fetchone()
                        if user:
                            user_data = dict(user)
                            payment_dict['client_name'] = user_data.get('username') or user_data.get('email', '')
                            payment_dict['client_email'] = user_data.get('email', '')
                    
                    # Get pilot info
                    if booking_data.get('pilot_id'):
                        cursor.execute('SELECT name, email FROM pilots WHERE id = ?', (booking_data['pilot_id'],))
                        pilot = cursor.fetchone()
                        if pilot:
                            pilot_data = dict(pilot)
                            payment_dict['pilot_name'] = pilot_data.get('name', '')
                            payment_dict['pilot_email'] = pilot_data.get('email', '')
                    
                    # Get referral info
                    if booking_data.get('referral_id'):
                        cursor.execute('SELECT name, email FROM referrals WHERE id = ?', (booking_data['referral_id'],))
                        referral = cursor.fetchone()
                        if referral:
                            referral_data = dict(referral)
                            payment_dict['referral_name'] = referral_data.get('name', '')
                            payment_dict['referral_email'] = referral_data.get('email', '')
            
            # Clean up None values
            for key in list(payment_dict.keys()):
                if payment_dict[key] is None:
                    payment_dict[key] = ''
            
            payments_list.append(payment_dict)
        
        conn.close()
        
        response = jsonify(payments_list)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    except Exception as e:
        print(f"Error fetching payments: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': str(e), 'error': 'Failed to fetch payments'}), 500


@app.route('/api/admin/cancellations', methods=['GET', 'POST'])
@token_required
def manage_cancellations(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    if request.method == 'GET':
        try:
            conn = get_db()
            cancellations = conn.execute('''
                SELECT c.*, b.property_type, b.location 
                FROM cancellations c
                JOIN bookings b ON c.booking_id = b.id
                ORDER BY c.created_at DESC
            ''').fetchall()
            conn.close()
            
            return jsonify([dict(cancellation) for cancellation in cancellations])
        except Exception as e:
            return jsonify({'message': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            conn = get_db()
            
            conn.execute('''
                INSERT INTO cancellations (booking_id, reason, refund_amount)
                VALUES (?, ?, ?)
            ''', (data['booking_id'], data['reason'], data['refund_amount']))
            
            # Update booking status
            conn.execute('''
                UPDATE bookings 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (data['booking_id'],))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Cancellation processed successfully'})
        except Exception as e:
            return jsonify({'message': str(e)}), 500

@app.route('/api/admin/stats', methods=['GET'])
@token_required
def get_admin_stats(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        conn = get_db()
        
        # Get video stats
        video_stats = conn.execute('''
            SELECT 
                COUNT(CASE WHEN status = 'pending' AND review_type = 'before' THEN 1 END) as pending_before,
                COUNT(CASE WHEN status = 'pending' AND review_type = 'after' THEN 1 END) as pending_after
            FROM videos
        ''').fetchone()
        
        # Get order stats
        order_stats = conn.execute('''
            SELECT 
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as new_orders,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as ongoing_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
            FROM bookings
        ''').fetchone()
        
        # Get revenue stats
        revenue_stats = conn.execute('''
            SELECT 
                COALESCE(SUM(amount), 0) as total_revenue
            FROM payments
            WHERE status = 'completed'
            AND created_at >= date('now', 'start of month')
        ''').fetchone()
        
        conn.close()
        
        return jsonify({
            'videos': dict(video_stats),
            'orders': dict(order_stats),
            'revenue': dict(revenue_stats)
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# Pre-List Management Endpoints
@app.route('/api/admin/pre-list', methods=['GET', 'POST'])
@token_required
def manage_pre_list(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    if request.method == 'GET':
        try:
            conn = get_db()
            items = conn.execute('SELECT * FROM pre_list ORDER BY created_at DESC').fetchall()
            conn.close()
            
            return jsonify([dict(item) for item in items])
        except Exception as e:
            return jsonify({'message': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            conn = get_db()
            
            conn.execute('''
                INSERT INTO pre_list (title, description, category, status)
                VALUES (?, ?, ?, ?)
            ''', (data['title'], data['description'], data['category'], data['status']))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Item added successfully'})
        except Exception as e:
            return jsonify({'message': str(e)}), 500

@app.route('/api/admin/pre-list/<int:item_id>', methods=['PUT', 'DELETE'])
@token_required
def manage_pre_list_item(current_user, item_id):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    if request.method == 'PUT':
        try:
            data = request.get_json()
            conn = get_db()
            
            conn.execute('''
                UPDATE pre_list 
                SET title = ?, description = ?, category = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (data['title'], data['description'], data['category'], data['status'], item_id))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Item updated successfully'})
        except Exception as e:
            return jsonify({'message': str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            conn = get_db()
            
            conn.execute('DELETE FROM pre_list WHERE id = ?', (item_id,))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Item deleted successfully'})
        except Exception as e:
            return jsonify({'message': str(e)}), 500

@app.route('/api/admin/orders', methods=['GET', 'POST'])
@token_required
def get_admin_orders(current_user):
    # Handle preflight request
    if current_user['role'] != 'admin':
        response = jsonify({'message': 'Unauthorized'}), 403
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Handle POST request for creating new order
    if request.method == 'POST':
        data = request.json
        print("\n=== Creating New Order (Admin) ===")
        print(f"Order data: {data}")
        
        try:
            # Validate required fields
            required_fields = ['client_name', 'client_email', 'pilot_id', 'property_type', 'preferred_date', 'location', 'duration', 'payment_amount']
            for field in required_fields:
                if field not in data:
                    return jsonify({'message': f'Missing required field: {field}'}), 400
                if not data[field]:
                    return jsonify({'message': f'Empty required field: {field}'}), 400

            # Validate data types
            try:
                pilot_id = int(data['pilot_id'])
                duration = int(data['duration'])
                payment_amount = float(data['payment_amount'])
                
                if duration < 1 or duration > 8:
                    return jsonify({'message': 'Duration must be between 1 and 8 hours'}), 400
                if payment_amount <= 0:
                    return jsonify({'message': 'Payment amount must be greater than 0'}), 400
            except ValueError:
                return jsonify({'message': 'Invalid numeric values'}), 400

            try:
                datetime.strptime(data['preferred_date'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

            conn = get_db()
            cursor = conn.cursor()

            # Verify pilot exists
            cursor.execute('SELECT id FROM pilots WHERE id = ?', (pilot_id,))
            if not cursor.fetchone():
                return jsonify({'message': 'Pilot not found'}), 404

            # Create the booking/order with client details in notes
            client_info = f"Client: {data['client_name']} ({data['client_email']})"
            requirements = data.get('requirements', '')
            if requirements:
                client_info += f"\nRequirements: {requirements}"

            cursor.execute('''
                INSERT INTO bookings (
                    pilot_id, property_type, preferred_date, location, 
                    duration, requirements, status, payment_amount, payment_status,
                    client_notes
                ) VALUES (?, ?, ?, ?, ?, ?, 'assigned', ?, 'pending', ?)
            ''', (
                pilot_id,
                data['property_type'], 
                data['preferred_date'],
                data['location'], 
                duration, 
                requirements,
                payment_amount,
                client_info
            ))
            
            conn.commit()
            booking_id = cursor.lastrowid
            print(f"Created order with ID: {booking_id}")
            conn.close()
            
            return jsonify({
                'message': 'Order created successfully',
                'booking_id': booking_id
            }), 201
            
        except sqlite3.Error as e:
            print(f"Database error: {str(e)}")
            return jsonify({'message': f'Database error: {str(e)}'}), 500
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return jsonify({'message': f'Failed to create order: {str(e)}'}), 500
    
    # Handle GET request for fetching orders
    try:
        conn = get_db()

        # Get status filter from query parameters
        status_filter = request.args.get('status', 'all')

        # Use a simple query with only the columns we know exist from your data
        base_query = '''
            SELECT b.*,
                   COALESCE(u.username, 'Unknown Client') as client_name,
                   u.username, u.email as client_email, u.id as client_id, b.property_type,
                   p.name as pilot_name, p.email as pilot_email, p.id as pilot_id_actual,
                   e.name as editor_name, e.email as editor_email, e.id as editor_id_actual,
                   r.name as referral_name, r.id as referral_id_actual
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN pilots p ON b.pilot_id = p.id
            LEFT JOIN editors e ON b.editor_id = e.id
            LEFT JOIN referrals r ON b.referral_id = r.id
        '''

        # Optional filter for guest-referral orders
        guest_referral_only = request.args.get('guest_referral') in ('1', 'true', 'yes')

        # Add status filtering
        if status_filter == 'pending':
            where_clause = "WHERE b.status IN ('pending', 'pending_approval')"
        elif status_filter == 'ongoing':
            where_clause = "WHERE b.status NOT IN ('pending', 'pending_approval', 'completed', 'rejected', 'cancelled')"
        elif status_filter == 'completed':
            where_clause = "WHERE b.status = 'completed'"
        elif status_filter == 'cancelled':
            where_clause = "WHERE b.status = 'cancelled'"
        else:
            where_clause = ""

        # Apply guest-referral filter
        if guest_referral_only:
            if where_clause:
                where_clause += " AND b.referral_id IS NOT NULL AND b.user_id IS NULL"
            else:
                where_clause = "WHERE b.referral_id IS NOT NULL AND b.user_id IS NULL"

        query = base_query + (" " + where_clause if where_clause else "") + " ORDER BY b.created_at DESC"

        orders = conn.execute(query).fetchall()
        conn.close()

        # Process orders to handle cases where user_id is null
        processed_orders = []
        for order in orders:
            order_dict = dict(order)

            # If no user data, try to extract from client_notes
            if not order_dict.get('name') and order_dict.get('client_notes'):
                client_notes = order_dict['client_notes']
                if client_notes.startswith('Client: '):
                    # Extract client name and email from notes
                    client_info = client_notes.split('\n')[0]
                    client_parts = client_info.replace('Client: ', '').split(' (')
                    if len(client_parts) == 2:
                        order_dict['name'] = client_parts[0]
                        order_dict['client_email'] = client_parts[1].rstrip(')')

            # Format the order data with ALL booking fields
            formatted_order = {
                # Basic Information
                'id': order_dict.get('id'),
                'booking_id': f"HMX{order_dict.get('id', ''):04d}",
                'user_id': order_dict.get('user_id'),
                'status': order_dict.get('status', 'pending'),
                'created_at': order_dict.get('created_at', ''),
                'updated_at': order_dict.get('updated_at', ''),

                # Client Information
                'client_id': order_dict.get('client_id'),
                'client_name': order_dict.get('client_name') or order_dict.get('guest_name') or order_dict.get('name', 'Unknown'),
                'client_email': order_dict.get('client_email') or order_dict.get('guest_email') or '',

                # Team Assignment
                'pilot_id': order_dict.get('pilot_id'),
                'pilot_name': order_dict.get('pilot_name', ''),
                'editor_id': order_dict.get('editor_id'),
                'editor_name': order_dict.get('editor_name', ''),
                'referral_id': order_dict.get('referral_id'),
                'referral_name': order_dict.get('referral_name', ''),

                # Location & Property
                'location': order_dict.get('location', ''),
                'location_address': order_dict.get('location_address', ''),
                'gps_link': order_dict.get('gps_link', ''),
                'property_type': order_dict.get('property_type', ''),
                
                'indoor_outdoor': order_dict.get('indoor_outdoor', ''),
                'area_size': order_dict.get('area_size', 0),
                'area_unit': order_dict.get('area_unit', ''),
                'area_sqft': order_dict.get('area_sqft', 0),
                'num_floors': order_dict.get('num_floors', 0),
                'rooms_sections': order_dict.get('rooms_sections', 0),
                'duration': order_dict.get('duration', 0),

                # Scheduling
                'preferred_date': order_dict.get('preferred_date', ''),
                'preferred_time': order_dict.get('preferred_time', ''),
                'shooting_hours': order_dict.get('shooting_hours', 0),
                'area_covered': order_dict.get('area_covered', 0),

                
                'background_music_voiceover': bool(order_dict.get('background_music_voiceover', 0)),
                'editing_color_grading': bool(order_dict.get('editing_color_grading', 0)),
                'voiceover_script': bool(order_dict.get('voiceover_script', 0)),
                'background_music_licensed': bool(order_dict.get('background_music_licensed', 0)),
                'branding_overlay': bool(order_dict.get('branding_overlay', 0)),
                'multiple_revisions': bool(order_dict.get('multiple_revisions', 0)),
                'drone_licensing_fee': bool(order_dict.get('drone_licensing_fee', 0)),
                'drone_permissions_required': bool(order_dict.get('drone_permissions_required', 0)),

                # Financial Information
                'base_package_cost': order_dict.get('base_package_cost', 0),
                'base_cost': order_dict.get('base_cost', 0),
                'total_cost': order_dict.get('total_cost', 0),
                'discount_code': order_dict.get('discount_code', ''),
                'discount_amount': order_dict.get('discount_amount', 0),
                'payment_status': order_dict.get('payment_status', 'pending'),
                'payment_amount': order_dict.get('payment_amount', 0),
                'total_amount': order_dict.get('payment_amount', 0),  # For backward compatibility
                'payment_date': order_dict.get('payment_date', ''),
                'completed_date': order_dict.get('completed_date', ''),

                # Requirements & Notes
                'requirements': order_dict.get('requirements', ''),
                'special_requirements': order_dict.get('special_requirements', ''),
                'custom_quote': order_dict.get('custom_quote', ''),
                'description': order_dict.get('description', ''),
                'pilot_notes': order_dict.get('pilot_notes', ''),
                'client_notes': order_dict.get('client_notes', ''),
                'admin_comments': order_dict.get('admin_comments', ''),

                # Links & Deliverables
                'drive_link': order_dict.get('drive_link', ''),
                'delivery_video_link': order_dict.get('delivery_video_link', ''),
                
                #Earnings
                'pilot_earnings': order_dict.get('pilot_earnings', ''),
                'editor_earnings': order_dict.get('editor_earnings', ''),
                'referral_earnings': order_dict.get('referral_earnings', ''),
                'hmx_earnings': order_dict.get('hmx_earnings', ''),
                'gateway_fees': order_dict.get('gateway_fees', ''),
            }

            # Mark as guest referral order
            formatted_order['is_guest_referral'] = bool(order_dict.get('referral_id')) and not order_dict.get('user_id')

            processed_orders.append(formatted_order)

        # Debug: Print raw data from database
        if orders:
            print("Raw order from DB:", dict(orders[0]))
            print("Raw order keys:", list(dict(orders[0]).keys()))

        # Debug: Print processed order data
        if processed_orders:
            print("Processed order keys:", list(processed_orders[0].keys()))
            sample = processed_orders[0]
            print("Sample processed values:")
            for key, value in sample.items():
                if value and value != '' and value != 0:
                    print(f"  {key}: {value}")

        return jsonify(processed_orders)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/admin/debug/bookings', methods=['GET'])
@token_required
def debug_bookings(current_user):
    """Debug endpoint to check bookings directly"""
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()

        # Get all bookings with basic info
        cursor = conn.cursor()
        cursor.execute('SELECT id, user_id, status, property_type, location_address, created_at FROM bookings ORDER BY created_at DESC')
        bookings = cursor.fetchall()

        # Get all users
        cursor.execute('SELECT id, name, email FROM users')
        users = cursor.fetchall()

        conn.close()

        return jsonify({
            'bookings': [dict(zip(['id', 'user_id', 'status', 'property_type', 'location_address', 'created_at'], booking)) for booking in bookings],
            'users': [dict(zip(['id', 'name', 'email'], user)) for user in users],
            'total_bookings': len(bookings),
            'total_users': len(users)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/fpv-events', methods=['GET'])
@token_required
def get_fpv_events(current_user):
    """Get all FPV event bookings"""
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Fetch all FPV events
        cursor.execute("""
            SELECT 
                id, event_name, event_type, event_date, location_address, gps_link,
                venue_type, shots_required, event_duration_hours, budget_range,
                preferred_date, preferred_time,
                event_start_date, event_end_date, expected_attendees,
                organization_name, contact_person,
                guest_name, guest_email, guest_phone, guest_address,
                special_requirements, referral_id, pilot_id, editor_id,
                status, payment_status, base_package_cost, total_cost, admin_comments,
                created_at, updated_at
            FROM fpv_events 
            ORDER BY created_at DESC
        """)
        
        events = []
        for row in cursor.fetchall():
            events.append({
                'id': row[0],
                'event_name': row[1],
                'event_type': row[2],
                'event_date': row[3],
                'location_address': row[4],
                'gps_link': row[5],
                'venue_type': row[6],
                'shots_required': row[7],
                'event_duration_hours': row[8],
                'budget_range': row[9],
                'preferred_date': row[10],
                'preferred_time': row[11],
                'event_start_date': row[12],
                'event_end_date': row[13],
                'expected_attendees': row[14],
                'organization_name': row[15],
                'contact_person': row[16],
                'guest_name': row[17],
                'guest_email': row[18],
                'guest_phone': row[19],
                'guest_address': row[20],
                'special_requirements': row[21],
                'referral_id': row[22],
                'pilot_id': row[23],
                'editor_id': row[24],
                'status': row[25],
                'payment_status': row[26],
                'base_package_cost': row[27],
                'total_cost': row[28],
                'admin_comments': row[29],
                'created_at': row[30],
                'updated_at': row[31],
            })
        
        conn.close()
        return jsonify(events), 200
        
    except Exception as e:
        print(f"Error fetching FPV events: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/orders/<int:order_id>', methods=['PUT', 'DELETE'])
@token_required
def manage_order(current_user, order_id):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Fetch order (needed for notifications)
        cursor.execute('''
            SELECT b.*, u.username AS client_name, u.email AS client_email
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.id = ?
        ''', (order_id,))
        order = cursor.fetchone()

        if not order:
            conn.close()
            return jsonify({'message': 'Order not found'}), 404

        # Convert to dict for safe .get access
        order = dict(order)

        if request.method == 'PUT':
            data = request.json
            print("=== PUT Request Received ===")
            print("Raw JSON:", request.data)
            print("Parsed JSON:", data)

            if data.get('status') is not None:
                conn.close()
                return jsonify({'message': 'Direct status updates are disabled. Use lifecycle endpoints.'}), 400


            update_fields = []
            update_values = []

            # Accept/Approve with custom cost
            if data.get('status') == 'approved':
                # Allow admin to set custom total_cost and recalculate earnings
                custom_total_cost = data.get('total_cost')
                if custom_total_cost is not None:
                    update_fields.append('total_cost = ?')
                    update_values.append(custom_total_cost)
                    # Calculate earnings
                    pilot_pct = 0.50
                    editor_pct = 0.15
                    gateway_pct = 0.025
                    has_referral = bool(order.get('referral_id'))
                    if has_referral:
                        referral_pct = 0.125
                        hmx_pct = 0.20
                    else:
                        referral_pct = 0.0
                        hmx_pct = 0.325
                    pilot_earnings = round(float(custom_total_cost) * pilot_pct, 2)
                    editor_earnings = round(float(custom_total_cost) * editor_pct, 2)
                    referral_earnings = round(float(custom_total_cost) * referral_pct, 2)
                    hmx_earnings = round(float(custom_total_cost) * hmx_pct, 2)
                    gateway_fees = round(float(custom_total_cost) * gateway_pct, 2)
                    update_fields += [
                        'pilot_earnings = ?',
                        'editor_earnings = ?',
                        'referral_earnings = ?',
                        'hmx_earnings = ?',
                        'gateway_fees = ?'
                    ]
                    update_values += [pilot_earnings, editor_earnings, referral_earnings, hmx_earnings, gateway_fees]
                if 'admin_comments' in data:
                    update_fields.append('admin_comments = ?')
                    update_values.append(data['admin_comments'])
                update_fields.append('status = ?')
                update_values.append('approved')
                update_fields.append('updated_at = CURRENT_TIMESTAMP')
                query = f"UPDATE bookings SET {', '.join(update_fields)} WHERE id = ?"
                update_values.append(order_id)
                print("Query:", query)
                print("Values:", update_values)
                cursor.execute(query, update_values)
                conn.commit()

                # If order has a referral and payment is already paid, ensure referral earnings are credited once
                try:
                    cursor.execute('SELECT referral_id, payment_status, referral_earnings FROM bookings WHERE id = ?', (order_id,))
                    row = cursor.fetchone()
                    if row:
                        ref_id, pay_status, existing_ref_earn = row[0], row[1], row[2] or 0
                        if ref_id and pay_status == 'paid' and existing_ref_earn == 0:
                            # Use either custom_total_cost or current total_cost
                            cursor.execute('SELECT COALESCE(total_cost, base_package_cost, 0) FROM bookings WHERE id = ?', (order_id,))
                            tc = cursor.fetchone()[0] or 0
                            ref_earn = round(float(tc) * 0.125, 2)
                            cursor.execute('UPDATE bookings SET referral_earnings = ? WHERE id = ?', (ref_earn, order_id))
                            cursor.execute('UPDATE referrals SET total_earnings = total_earnings + ? WHERE id = ?', (ref_earn, ref_id))
                            conn.commit()
                except Exception as credit_ex:
                    print(f"Warning: failed to credit referral earnings on approval: {credit_ex}")
                # Fallback to guest email for guest-referral orders
                to_email = order.get('client_email') or order.get('guest_email')
                to_name = order.get('client_name') or order.get('guest_name') or 'Customer'
                if to_email:
                    send_email_with_template_helper(
                        to_email=to_email,
                        template_name="order_approved",
                        variables={
                            "name": to_name,
                            "booking_id": order_id,
                            "date": order.get('preferred_date')
                        }
                    )
                conn.close()
                return jsonify({'message': 'Order approved and updated successfully'})

            # Reject with reason
            if data.get('status') == 'rejected':
                update_fields.append('status = ?')
                update_values.append('rejected')
                if 'admin_comments' in data:
                    update_fields.append('admin_comments = ?')
                    update_values.append(data['admin_comments'])
                update_fields.append('updated_at = CURRENT_TIMESTAMP')
                query = f"UPDATE bookings SET {', '.join(update_fields)} WHERE id = ?"
                update_values.append(order_id)
                print("Query:", query)
                print("Values:", update_values)
                cursor.execute(query, update_values)
                conn.commit()
                to_email = order.get('client_email') or order.get('guest_email')
                to_name = order.get('client_name') or order.get('guest_name') or 'Customer'
                if to_email:
                    send_email_with_template_helper(
                        to_email=to_email,
                        template_name="order_rejected",
                        variables={
                            "name": to_name,
                            "booking_id": order_id,
                            "reason": data.get("admin_comments", "Not specified")
                        }
                    )
                conn.close()
                return jsonify({'message': 'Order rejected successfully'})

            # Fallback: update other fields as before
            if 'status' in data or 'pilot_id' in data or 'editor_id' in data or 'admin_comments' in data:
                if 'status' in data:
                    update_fields.append('status = ?')
                    update_values.append(data['status'])
                if 'pilot_id' in data:
                    pilot_id = data['pilot_id']
                    if pilot_id:
                        # Ensure it's an integer
                        try:
                            pilot_id = int(pilot_id)
                            # FPV Connect Logic (Point 4)
                            # Orders > ₹50,000 -> Check if pilot is PAN India (if not manual)
                            cursor.execute("SELECT total_cost FROM bookings WHERE id = ?", (order_id,))
                            order_cost = cursor.fetchone()[0] or 0
                            
                            cursor.execute("SELECT is_pan_india, cities FROM pilots WHERE id = ?", (pilot_id,))
                            pilot_info = cursor.fetchone()
                            
                            if pilot_info:
                                is_pan_india = bool(pilot_info[0])
                                pilot_cities = pilot_info[1] or ""
                                
                                if order_cost > 50000 and not is_pan_india:
                                    print(f"Warning: Assigning local pilot to >50k order (Order: {order_cost})")
                                    # We allow it, but we log it. Logic says "Orders > 50k -> PAN India pilot"
                                    # usually implies a restriction or a default. 
                                    # If it's a strict rule, we could return an error here.
                                    # For now, let's treat it as a preference unless manual override is used.
                        except (ValueError, TypeError):
                            pilot_id = None
                            
                    update_fields.append('pilot_id = ?')
                    update_values.append(pilot_id)
                    update_fields.append('pilot_assignment_type = ?')
                    update_values.append('manual' if data.get('is_manual_assignment') else ('pan_india' if order_cost > 50000 else 'local'))
                if 'editor_id' in data:
                    update_fields.append('editor_id = ?')
                    update_values.append(data['editor_id'] if data['editor_id'] else None)
                if 'admin_comments' in data:
                    update_fields.append('admin_comments = ?')
                    update_values.append(data['admin_comments'])
                update_fields.append('updated_at = CURRENT_TIMESTAMP')
                query = f"UPDATE bookings SET {', '.join(update_fields)} WHERE id = ?"
                update_values.append(order_id)
                print("Query:", query)
                print("Values:", update_values)
                cursor.execute(query, update_values)
                conn.commit()
                # Notify client based on status
                if 'status' in data:
                    if data['status'] == "approved":
                        to_email = order.get('client_email') or order.get('guest_email')
                        to_name = order.get('client_name') or order.get('guest_name') or 'Customer'
                        if to_email:
                            send_email_with_template_helper(
                                to_email=to_email,
                                template_name="order_approved",
                                variables={
                                    "name": to_name,
                                    "booking_id": order_id,
                                    "date": order.get('preferred_date')
                                }
                            )
                    elif data['status'] == "rejected":
                        to_email = order.get('client_email') or order.get('guest_email')
                        to_name = order.get('client_name') or order.get('guest_name') or 'Customer'
                        if to_email:
                            send_email_with_template_helper(
                                to_email=to_email,
                                template_name="order_rejected",
                                variables={
                                    "name": to_name,
                                    "booking_id": order_id,
                                    "reason": data.get("admin_comments", "Not specified")
                                }
                            )
                    elif data['status'] == "completed":
                        # On completion, ensure referral earnings are correct and update referral's total_earnings accordingly
                        try:
                            cursor.execute('SELECT referral_id, referral_earnings FROM bookings WHERE id = ?', (order_id,))
                            row = cursor.fetchone()
                            if row:
                                ref_id, existing_ref_earn = row[0], row[1] or 0
                                if ref_id:
                                    # Use total_cost, fallback to base_package_cost, total_amount, or 0
                                    cursor.execute('SELECT COALESCE(total_cost, base_package_cost, total_amount, 0) FROM bookings WHERE id = ?', (order_id,))
                                    tc = cursor.fetchone()[0] or 0
                                    # Get commission rate from referrals table, default 12.5%
                                    cursor.execute('SELECT COALESCE(commission_rate, 12.5) FROM referrals WHERE id = ?', (ref_id,))
                                    rate_row = cursor.fetchone()
                                    rate = rate_row[0] if rate_row else 12.5
                                    rate_decimal = (rate / 100.0) if rate >= 1 else float(rate)
                                    ref_earn = round(float(tc) * rate_decimal, 2)
                                    # If referral_earnings is not set or wrong, update both bookings and referrals
                                    if not existing_ref_earn or abs(existing_ref_earn - ref_earn) > 0.01:
                                        # Remove old earnings if any
                                        if existing_ref_earn:
                                            cursor.execute('UPDATE referrals SET total_earnings = total_earnings - ? WHERE id = ?', (existing_ref_earn, ref_id))
                                        # Set new earnings
                                        cursor.execute('UPDATE bookings SET referral_earnings = ? WHERE id = ?', (ref_earn, order_id))
                                        cursor.execute('UPDATE referrals SET total_earnings = total_earnings + ? WHERE id = ?', (ref_earn, ref_id))
                                        conn.commit()
                        except Exception as complete_credit_ex:
                            print(f"Warning: failed to credit referral earnings on completion: {complete_credit_ex}")
                conn.close()
                return jsonify({'message': 'Order updated successfully'})

        elif request.method == 'DELETE':
            cursor.execute('DELETE FROM bookings WHERE id = ?', (order_id,))
            conn.commit()
            conn.close()

            # Notify client after deletion
            send_email_with_template_helper(
                to_email=order['client_email'],
                template_name="order_deleted",
                variables={
                    "name": order['client_name'],
                    "booking_id": order_id
                }
            )
            return jsonify({'message': 'Order deleted successfully'})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500



@app.route('/api/admin/dashboard/stats', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        # Get pending videos count
        c.execute('''
            SELECT COUNT(*) FROM videos 
            WHERE status = 'pending'
        ''')
        pending_videos = c.fetchone()[0]

        # Get active orders count
        c.execute('''
            SELECT COUNT(*) FROM bookings 
            WHERE status = 'in_progress'
        ''')
        active_orders = c.fetchone()[0]

        # Get revenue for current month
        current_month = datetime.now().strftime('%Y-%m')
        c.execute('''
            SELECT COALESCE(SUM(payment_amount), 0) 
            FROM bookings 
            WHERE payment_status = 'completed' 
            AND strftime('%Y-%m', payment_date) = ?
        ''', (current_month,))
        revenue_mtd = c.fetchone()[0] or 0

        # Get completed orders count
        c.execute('''
            SELECT COUNT(*) FROM bookings 
            WHERE status = 'completed'
        ''')
        completed_orders = c.fetchone()[0]

        return jsonify({
            'pendingVideos': pending_videos,
            'activeOrders': active_orders,
            'revenueMTD': revenue_mtd,
            'completedOrders': completed_orders
        })

    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/dashboard/activities', methods=['GET'])
@token_required
def get_dashboard_activities(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        # Get recent activities from various tables
        activities = []

        # Get recent bookings
        c.execute('''
            SELECT id, status, created_at 
            FROM bookings 
            ORDER BY created_at DESC 
            LIMIT 5
        ''')
        bookings = c.fetchall()
        for booking in bookings:
            activities.append({
                'id': f'booking_{booking[0]}',
                'type': 'order',
                'action': f'New booking {booking[0]}',
                'details': f'Status: {booking[1]}',
                'timestamp': booking[2]
            })

        # Get recent pilot registrations
        c.execute('''
            SELECT id, name, created_at 
            FROM pilots 
            ORDER BY created_at DESC 
            LIMIT 5
        ''')
        pilots = c.fetchall()
        for pilot in pilots:
            activities.append({
                'id': f'pilot_{pilot[0]}',
                'type': 'pilot',
                'action': 'New pilot registration',
                'details': f'Pilot: {pilot[1]}',
                'timestamp': pilot[2]
            })

        # Get recent referrals
        c.execute('''
            SELECT id, name, created_at 
            FROM referrals 
            ORDER BY created_at DESC 
            LIMIT 5
        ''')
        referrals = c.fetchall()
        for referral in referrals:
            activities.append({
                'id': f'referral_{referral[0]}',
                'type': 'referral',
                'action': 'New referral',
                'details': f'Referral: {referral[1]}',
                'timestamp': referral[2]
            })

        # Sort activities by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Return only the 10 most recent activities
        return jsonify(activities[:10])

    except Exception as e:
        print(f"Error fetching dashboard activities: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/settings', methods=['GET', 'PUT'])
@token_required
def manage_settings(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()

        if request.method == 'GET':
            # Return settings that match the frontend interface
            settings = {
                'companyName': 'HMX FPV Tours',
                'email': 'admin@hmxfpvtours.com',
                'phone': '+91 98765 43210',
                'address': '123 FPV Street, Mumbai, Maharashtra 400001',
                'currency': 'INR',
                'timezone': 'Asia/Kolkata',
                'notificationSettings': {
                    'emailNotifications': True,
                    'orderUpdates': True,
                    'paymentReminders': True,
                    'systemAlerts': True
                }
            }
            conn.close()
            return jsonify(settings)

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                conn.close()
                return jsonify({'error': 'No data provided'}), 400

            # For now, just return success (in a real app, you'd save to database)
            conn.close()
            return jsonify({'message': 'Settings updated successfully'})

    except Exception as e:
        print(f"Error managing settings: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/pilots/register', methods=['POST'])
def pilot_register():
    try:
        print('\n=== Pilot Registration ===')
        data = request.get_json()
        print(f"Registration data: {data}")

        # Validate required fields
        required_fields = ['name', 'full_name', 'email', 'phone', 'password', 'date_of_birth',
                          'gender', 'address', 'license_number', 'issuing_authority',
                          'license_issue_date', 'license_expiry_date', 'total_flying_hours',
                          'experience', 'equipment', 'pilot_license_url', 'id_proof_url', 'photograph_url']

        for field in required_fields:
            if field not in data or not data[field]:
                print(f"Missing required field: {field}")
                return jsonify({'message': f'Missing required field: {field}'}), 400

        # Validate email format
        if '@' not in data['email'] or '.' not in data['email']:
            print(f"Invalid email format: {data['email']}")
            return jsonify({'message': 'Invalid email format'}), 400

        # Validate password length
        if len(data['password']) < 6:
            print(f"Password too short: {len(data['password'])} characters")
            return jsonify({'message': 'Password must be at least 6 characters long'}), 400

        # Validate age (must be 18+)
        from datetime import datetime
        try:
            birth_date = datetime.strptime(data['date_of_birth'], '%Y-%m-%d')
            today = datetime.now()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            if age < 18:
                return jsonify({'message': 'Must be at least 18 years old'}), 400
        except ValueError:
            return jsonify({'message': 'Invalid date of birth format'}), 400

        # Validate license expiry
        try:
            expiry_date = datetime.strptime(data['license_expiry_date'], '%Y-%m-%d')
            if expiry_date <= datetime.now():
                return jsonify({'message': 'License must not be expired'}), 400
        except ValueError:
            return jsonify({'message': 'Invalid license expiry date format'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Check if email already exists in applications or main table
        cursor.execute('SELECT id FROM pilot_applications WHERE email = ? AND status="pending"', (data['email'],))
        if cursor.fetchone():
            print(f"Email already has pending application: {data['email']}")
            conn.close()
            return jsonify({'message': 'Application already submitted with this email'}), 409

        cursor.execute('SELECT id FROM pilots WHERE email = ?', (data['email'],))
        if cursor.fetchone():
            print(f"Email already exists: {data['email']}")
            conn.close()
            return jsonify({'message': 'Email already registered'}), 409

        # Hash password
        password_hash = generate_password_hash(data['password'])

        # Insert new pilot application
        cursor.execute('''
            INSERT INTO pilot_applications (
                name, full_name, password,email, phone,  password_hash, date_of_birth, gender, address,
                government_id_proof, license_number, issuing_authority, license_issue_date,
                license_expiry_date, drone_model, drone_serial, drone_uin, drone_category,
                total_flying_hours, flight_records, insurance_policy, insurance_validity,
                pilot_license_url, id_proof_url, training_certificate_url, photograph_url,
                insurance_certificate_url, cities, experience, equipment, portfolio_url, bank_account
            ) VALUES (?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data['full_name'],
            password_hash,
            data['email'],
            data['phone'],
            password_hash,  # For new password_hash column
            data['date_of_birth'],
            data['gender'],
            data['address'],
            data.get('government_id_proof', ''),
            data['license_number'],
            data['issuing_authority'],
            data['license_issue_date'],
            data['license_expiry_date'],
            data.get('drone_model', ''),
            data.get('drone_serial', ''),
            data.get('drone_uin', ''),
            data.get('drone_category', ''),
            data['total_flying_hours'],
            data.get('flight_records', ''),
            data.get('insurance_policy', ''),
            data.get('insurance_validity', ''),
            data['pilot_license_url'],
            data['id_proof_url'],
            data.get('training_certificate_url', ''),
            data['photograph_url'],
            data.get('insurance_certificate_url', ''),
            data.get('cities', ''),
            data['experience'],
            data['equipment'],
            data.get('portfolio_url', ''),
            data.get('bank_account', '')
        ))

        application_id = cursor.lastrowid
        conn.commit()
        conn.close()

        print(f"Pilot application submitted successfully with ID: {application_id}")

        # Create response with CORS headers
        response = jsonify({
            'message': 'Pilot application submitted successfully. Please wait for admin approval.',
            'application_id': application_id
        })
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 201

    except sqlite3.Error as e:
        print(f"Database error during pilot registration: {str(e)}")
        import traceback
        print(f"Database error traceback: {traceback.format_exc()}")

        # Close connection if still open
        try:
            if 'conn' in locals():
                conn.close()
        except:
            pass

        response = jsonify({'message': 'Database error during registration'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500
    except Exception as e:
        print(f"Unexpected error during pilot registration: {str(e)}")
        import traceback
        print(f"Unexpected error traceback: {traceback.format_exc()}")

        # Close connection if still open
        try:
            if 'conn' in locals():
                conn.close()
        except:
            pass

        response = jsonify({'message': 'Registration failed due to an unexpected error'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/editors/register', methods=['POST'])
def editor_register():
    try:
        print('\n=== Editor Registration ===')
        data = request.get_json()
        print(f"Registration data: {data}")

        # Validate required fields
        required_fields = ['full_name', 'email', 'phone', 'password', 'role', 'years_experience', 'primary_skills', 'specialization']
        for field in required_fields:
            if field not in data or not data[field]:
                print(f"Missing required field: {field}")
                return jsonify({'message': f'Missing required field: {field}'}), 400

        # Validate email format
        if '@' not in data['email'] or '.' not in data['email']:
            print(f"Invalid email format: {data['email']}")
            return jsonify({'message': 'Invalid email format'}), 400

        # Validate password length
        if len(data['password']) < 6:
            print(f"Password too short: {len(data['password'])} characters")
            return jsonify({'message': 'Password must be at least 6 characters long'}), 400

        # Validate years of experience
        try:
            years_exp = int(data['years_experience'])
            if years_exp < 0:
                return jsonify({'message': 'Years of experience must be a positive number'}), 400
        except (ValueError, TypeError):
            return jsonify({'message': 'Years of experience must be a valid number'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Check if email already exists in applications or main table
        cursor.execute('SELECT id FROM editor_applications WHERE email = ? AND status="pending"', (data['email'],))
        if cursor.fetchone():
            print(f"Email already exists in applications: {data['email']}")
            conn.close()
            return jsonify({'message': 'Application already submitted with this email'}), 409

        cursor.execute('SELECT id FROM editors WHERE email = ?', (data['email'],))
        if cursor.fetchone():
            print(f"Email already exists in editors: {data['email']}")
            conn.close()
            return jsonify({'message': 'Email already registered'}), 409

        # Hash password
        password_hash = generate_password_hash(data['password'])

        # Insert new editor application
        cursor.execute('''
            INSERT INTO editor_applications (
                full_name, email, phone, role, years_experience,
                primary_skills, specialization, portfolio_url, time_zone,
                government_id_url, tax_gst_number, password_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['full_name'],
            data['email'],
            data['phone'],
            data['role'],
            years_exp,
            data['primary_skills'],
            data['specialization'],
            data.get('portfolio_url', ''),
            data.get('time_zone', ''),
            data.get('government_id_url', ''),
            data.get('tax_gst_number', ''),
            password_hash
        ))

        application_id = cursor.lastrowid
        conn.commit()
        conn.close()

        print(f"Editor application submitted successfully with ID: {application_id}")

        # Create response with CORS headers
        response = jsonify({
            'message': 'Editor application submitted successfully. Please wait for admin approval.',
            'application_id': application_id
        })
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 201

    except sqlite3.Error as e:
        print(f"Database error during editor registration: {str(e)}")
        response = jsonify({'message': 'Database error during registration'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500
    except Exception as e:
        print(f"Unexpected error during editor registration: {str(e)}")
        response = jsonify({'message': 'Registration failed due to an unexpected error'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/editor/videos', methods=['GET'])
@token_required
def get_editor_videos(current_user):
    if current_user['role'] != 'editor':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        c = conn.cursor()
        
        # Fetch videos assigned to this editor
        c.execute('''
            SELECT id, booking_id, title, description, status, review_type, 
                   drive_link, review_notes, created_at, updated_at
            FROM videos 
            WHERE editor_id = ?
            ORDER BY created_at DESC
        ''', (current_user['id'],))
        videos = c.fetchall()
        
        videos_list = []
        for video in videos:
            try:
                video_dict = {
                    'id': video[0],
                    'booking_id': video[1],
                    'title': video[2],
                    'description': video[3],
                    'status': video[4],
                    'review_type': video[5],
                    'drive_link': video[6],
                    'review_notes': video[7],
                    'created_at': video[8],
                    'updated_at': video[9]
                }
                videos_list.append(video_dict)
            except Exception as e:
                print(f"Error processing video data: {e}")
                continue

        conn.close()
        return jsonify(videos_list)

    except Exception as e:
        print(f"Error fetching videos: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/editor/videos/<int:video_id>', methods=['PUT'])
@token_required
def update_editor_video(current_user, video_id):
    if current_user['role'] != 'editor':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        conn = get_db()
        c = conn.cursor()

        # Check if video exists
        c.execute('SELECT id FROM videos WHERE id = ?', (video_id,))
        if not c.fetchone():
            conn.close()
            return jsonify({'error': 'Video not found'}), 404

        # Update video
        update_fields = []
        update_values = []
        
        if 'status' in data:
            update_fields.append('status = ?')
            update_values.append(data['status'])
        if 'review_notes' in data:
            update_fields.append('review_notes = ?')
            update_values.append(data['review_notes'])

        if not update_fields:
            conn.close()
            return jsonify({'error': 'No valid fields to update'}), 400

        update_fields.append('updated_at = CURRENT_TIMESTAMP')
        update_values.append(video_id)
        
        query = f'''
            UPDATE videos 
            SET {', '.join(update_fields)}
            WHERE id = ?
        '''
        
        c.execute(query, update_values)
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Video updated successfully'})

    except Exception as e:
        print(f"Error updating video: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/clients', methods=['GET'])
@token_required
def get_clients(current_user):
    # Handle preflight request
    print("\n=== Admin Clients Request ===")
    print(f"Requesting user role: {current_user['role']}")
    
    if current_user['role'] != 'admin':
        print("Unauthorized access attempt")
        response = jsonify({'message': 'Unauthorized'}), 403
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        conn = get_db()
        c = conn.cursor()
        
        # Get all clients (users with role 'client') with their business details and order info
        c.execute('''
            SELECT
                u.id,
                u.username as contact_name,
                bc.business_name,
                bc.contact_person_designation as position,
                bc.phone,
                u.email,
                bc.official_address as city,
                u.created_at,
                COUNT(b.id) as order_count,
                COALESCE(SUM(b.payment_amount), 0) as total_order_value
            FROM users u
            LEFT JOIN business_clients bc ON u.email = bc.email
            LEFT JOIN bookings b ON u.id = b.user_id
            WHERE u.role = 'client'
            GROUP BY u.id
            ORDER BY u.created_at DESC
        ''')
        
        clients = c.fetchall()
        conn.close()
        
        clients_list = []
        for client in clients:
            client_dict = {
                'id': client[0],
                'contact_name': client[1],
                'business_name': client[2],
                'position': client[3],
                'phone': client[4],
                'email': client[5],
                'city': client[6],
                'created_at': client[7],
                'order_count': client[8],
                'total_order_value': float(client[9]) if client[9] else 0
            }
            clients_list.append(client_dict)
        
        print(f"Found {len(clients_list)} clients")
        
        response = jsonify(clients_list)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    except Exception as e:
        print(f"Error fetching clients: {str(e)}")
        response = jsonify({'message': 'Error fetching clients'}), 500
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

@app.route('/api/admin/clients/<int:client_id>/details', methods=['GET'])
@token_required
def get_client_details(current_user, client_id):
    """Get detailed information for a specific client"""
    try:
        conn = get_db()
        c = conn.cursor()

        # Get detailed client information by joining users and business_clients tables
        c.execute('''
            SELECT
                u.id,
                u.username as user_contact_name,
                u.email as user_email,
                u.phone as user_phone,
                u.created_at as user_created_at,
                u.approval_status as user_approval_status,
                bc.id as business_id,
                bc.business_name,
                bc.registration_number,
                bc.organization_type,
                bc.incorporation_date,
                bc.official_address,
                bc.official_email,
                bc.phone as business_phone,
                bc.contact_name as business_contact_name,
                bc.contact_person_designation,
                bc.email as business_email,
                bc.registration_certificate_url,
                bc.tax_identification_url,
                bc.business_license_url,
                bc.address_proof_url,
                bc.approval_status as business_approval_status,
                bc.status as business_status,
                bc.created_at as business_created_at,
                bc.updated_at as business_updated_at,
                COUNT(b.id) as order_count,
                COALESCE(SUM(b.payment_amount), 0) as total_order_value
            FROM users u
            LEFT JOIN business_clients bc ON u.email = bc.email
            LEFT JOIN bookings b ON u.id = b.user_id
            WHERE u.id = ? AND u.role = 'client'
            GROUP BY u.id
        ''', (client_id,))

        client = c.fetchone()
        conn.close()

        if not client:
            return jsonify({'message': 'Client not found'}), 404

        # Convert to dictionary
        client_dict = dict(client)

        response = jsonify(client_dict)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error fetching client details: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

# Old pilot_apply endpoint removed - use /api/pilots/register instead
# The old endpoint was using a simple schema that conflicts with the new comprehensive schema

@app.route('/api/admin/pilot-applications', methods=['GET'])
@token_required
def list_pilot_applications(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM pilot_applications ORDER BY created_at DESC')
        rows = c.fetchall()
        columns = [desc[0] for desc in c.description]
        applications = [dict(zip(columns, row)) for row in rows]
        conn.close()
        return jsonify(applications)
    except Exception as e:
        print(f"Error fetching pilot applications: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/pilot-applications/<int:app_id>/approve', methods=['POST'])
@token_required
def approve_pilot_application(current_user, app_id):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    admin_comments = data.get('admin_comments', '')
    try:
        conn = get_db()
        c = conn.cursor()
        # Get application
        c.execute('SELECT * FROM pilot_applications WHERE id = ?', (app_id,))
        app_row = c.fetchone()
        if not app_row:
            conn.close()
            return jsonify({'error': 'Application not found'}), 404
        columns = [desc[0] for desc in c.description]
        app_data = dict(zip(columns, app_row))
        # Create pilot in pilots table
        c.execute('SELECT id FROM pilots WHERE email = ?', (app_data['email'],))
        if c.fetchone():
            conn.close()
            return jsonify({'error': 'Pilot already exists'}), 409
        c.execute('''
            INSERT INTO pilots (name, email, phone, password, experience, equipment, cities, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
        ''', (
            app_data['name'],
            app_data['email'],
            app_data['phone'],
            app_data['password'],
            app_data['experience'],
            app_data['equipment'],
            app_data['cities']
        ))
        # Update application status
        c.execute('''
            UPDATE pilot_applications SET status = 'approved', admin_comments = ? WHERE id = ?
        ''', (admin_comments, app_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Pilot approved and registered.'})
    except Exception as e:
        print(f"Error approving pilot application: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/pilot-applications/<int:app_id>/reject', methods=['POST'])
@token_required
def reject_pilot_application(current_user, app_id):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    admin_comments = data.get('admin_comments', '')
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            UPDATE pilot_applications SET status = 'rejected', admin_comments = ? WHERE id = ?
        ''', (admin_comments, app_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Application rejected.'})
    except Exception as e:
        print(f"Error rejecting pilot application: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/cities', methods=['GET'])
def get_cities():
    response = jsonify(CITY_LIST)
    response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/api/cost/preview', methods=['POST'])
def cost_preview():
    data = request.json
    category = data.get('category')
    area_sqft = data.get('area_sqft')
    num_floors = data.get('num_floors')
    def calculate_cost(category, area_sqft, num_floors):
        COSTING_TABLE = {
            "Retail Store / Showroom":      [5999,  9999,  15999, 20999, None],
            "Restaurants & Cafes":          [7999, 11999, 19999, 25999, None],
            "Fitness & Sports Arenas":      [9999, 13999, 22999, 31999, None],
            "Resorts & Farmstays / Hotels": [11999,17999, 29999, 39999, None],
            "Real Estate Property":         [13999,23999, 37999, 49999, None],
            "Shopping Mall / Complex":      [15999,29999, 47999, 63999, None],
            "Adventure / Water Parks":      [12999,23999, 39999, 55999, None],
            "Gaming & Entertainment Zones": [10999,19999, 33999, 45999, None],
        }
        area_ranges = [1000, 5000, 10000, 50000]
        if category not in COSTING_TABLE:
            return None, None, "Invalid category"
        try:
            area_sqft = int(area_sqft)
        except:
            return None, None, "Invalid area"
        try:
            num_floors = int(num_floors)
        except:
            num_floors = 1
        if area_sqft > 50000:
            return None, None, "Custom Quote"
        idx = 0
        for i, max_area in enumerate(area_ranges):
            if area_sqft <= max_area:
                idx = i
                break
            idx = i + 1
        base_cost = COSTING_TABLE[category][idx]
        if base_cost is None:
            return None, None, "Custom Quote"
        if num_floors is None or num_floors < 1:
            num_floors = 1
        final_cost = int(base_cost * (1 + 0.1 * (num_floors - 1)))
        return base_cost, final_cost, None
    base_cost, final_cost, custom_quote = calculate_cost(category, area_sqft, num_floors)
    return jsonify({
        'base_cost': base_cost,
        'final_cost': final_cost,
        'custom_quote': custom_quote
    })

# Admin Payments Endpoint

@app.route('/api/admin/payments', methods=['GET'])
@token_required
def get_admin_payments(current_user):
    """Get all payment records for admin dashboard"""
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Simple query to get payments
        cursor.execute('''
            SELECT 
                p.id,
                p.booking_id,
                p.amount,
                p.status,
                COALESCE(p.payment_method, 'phonepe') as payment_method,
                COALESCE(p.merchant_transaction_id, '') as transaction_id,
                p.created_at,
                p.updated_at
            FROM payments p
            ORDER BY p.created_at DESC
        ''')
        
        payments = cursor.fetchall()
        
        # Build response with additional info
        payments_list = []
        for payment in payments:
            payment_dict = dict(payment)
            booking_id = payment_dict.get('booking_id')
            
            # Get booking details
            if booking_id:
                cursor.execute('SELECT user_id, pilot_id, referral_id, property_type FROM bookings WHERE id = ?', (booking_id,))
                booking = cursor.fetchone()
                if booking:
                    booking_data = dict(booking)
                    payment_dict['industry'] = booking_data.get('property_type', '')
                    payment_dict['location'] = ''
                    
                    # Get client info
                    if booking_data.get('user_id'):
                        cursor.execute('SELECT username, email FROM users WHERE id = ?', (booking_data['user_id'],))
                        user = cursor.fetchone()
                        if user:
                            user_data = dict(user)
                            payment_dict['client_name'] = user_data.get('username') or user_data.get('email', '')
                            payment_dict['client_email'] = user_data.get('email', '')
                            payment_dict['client_company'] = ''
                            payment_dict['client_phone'] = ''
                    
                    # Get pilot info
                    if booking_data.get('pilot_id'):
                        cursor.execute('SELECT name, email FROM pilots WHERE id = ?', (booking_data['pilot_id'],))
                        pilot = cursor.fetchone()
                        if pilot:
                            pilot_data = dict(pilot)
                            payment_dict['pilot_name'] = pilot_data.get('name', '')
                            payment_dict['pilot_email'] = pilot_data.get('email', '')
                            payment_dict['pilot_phone'] = ''
                    
                    # Get referral info
                    if booking_data.get('referral_id'):
                        cursor.execute('SELECT name, email FROM referrals WHERE id = ?', (booking_data['referral_id'],))
                        referral = cursor.fetchone()
                        if referral:
                            referral_data = dict(referral)
                            payment_dict['referral_name'] = referral_data.get('name', '')
                            payment_dict['referral_email'] = referral_data.get('email', '')
            
            # Set defaults for missing fields
            payment_dict.setdefault('industry', '')
            payment_dict.setdefault('location', '')
            payment_dict.setdefault('client_name', '')
            payment_dict.setdefault('client_company', '')
            payment_dict.setdefault('client_email', '')
            payment_dict.setdefault('client_phone', '')
            payment_dict.setdefault('pilot_name', '')
            payment_dict.setdefault('pilot_email', '')
            payment_dict.setdefault('pilot_phone', '')
            payment_dict.setdefault('referral_name', '')
            payment_dict.setdefault('referral_email', '')
            
            # Clean up None values
            for key in payment_dict:
                if payment_dict[key] is None:
                    payment_dict[key] = ''
            
            payments_list.append(payment_dict)
        
        conn.close()
        return jsonify(payments_list)
        
    except Exception as e:
        print(f"Error fetching admin payments: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'Failed to fetch payments', 'error': str(e)}), 500

# PhonePe Payment Integration Endpoints

@app.route('/api/payment/initiate', methods=['POST'])
@token_required
def initiate_payment(current_user):
    """Initiate PhonePe payment for a booking"""
    if current_user['role'] != 'client':
        return jsonify({'message': 'Only clients can initiate payments'}), 403

    try:
        data = request.get_json()
        booking_id = data.get('booking_id')
        amount = data.get('amount')

        if not booking_id or not amount:
            return jsonify({'message': 'Booking ID and amount are required'}), 400

        # Get booking details
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT b.*, u.phone, u.contact_name, u.business_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            WHERE b.id = ? AND b.user_id = ?
        ''', (booking_id, current_user['id']))
        
        booking = cursor.fetchone()
        conn.close()

        if not booking:
            return jsonify({'message': 'Booking not found'}), 404

        # Prepare customer info for PhonePe
        customer_info = {
            'user_id': current_user['id'],
            'phone': booking['phone'],
            'name': booking['contact_name'],
            'business_name': booking['business_name']
        }

        # Initiate PhonePe payment
        payment_result = phonepe.create_payment_request(booking_id, amount, customer_info)

        if payment_result['success']:
            # Store payment record in database
            conn = get_db()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO payments (
                    booking_id, amount, status, payment_method, 
                    merchant_transaction_id, payment_gateway
                ) VALUES (?, ?, 'pending', 'phonepe', ?, 'phonepe')
            ''', (booking_id, amount, payment_result['merchant_transaction_id']))
            
            conn.commit()
            conn.close()

            return jsonify({
                'success': True,
                'payment_url': payment_result['payment_url'],
                'transaction_id': payment_result['transaction_id']
            })
        else:
            return jsonify({
                'success': False,
                'message': payment_result['error']
            }), 400

    except Exception as e:
        print(f"Error initiating payment: {str(e)}")
        return jsonify({'message': 'Failed to initiate payment'}), 500

@app.route('/api/payment/callback', methods=['POST', 'GET'])
def payment_callback():
    """Handle PhonePe payment callback"""
    try:
        # Get callback data
        if request.method == 'POST':
            callback_data = request.get_json()
        else:
            # For GET requests, parse query parameters
            callback_data = request.args.to_dict()

        print(f"Payment callback received: {callback_data}")

        # Validate callback
        is_valid, message = phonepe.validate_callback(callback_data)

        if not is_valid:
            print(f"Invalid callback: {message}")
            return jsonify({'message': 'Invalid callback'}), 400

        # Check payment status with PhonePe
        merchant_transaction_id = callback_data.get('merchantTransactionId')
        status_result = phonepe.check_payment_status(merchant_transaction_id)

        if status_result['success']:
            payment_status = status_result['status']

            # Update payment record in database
            conn = get_db()
            cursor = conn.cursor()

            # Update payment status
            cursor.execute('''
                UPDATE payments 
                SET status = ?, gateway_response = ?, updated_at = CURRENT_TIMESTAMP
                WHERE merchant_transaction_id = ?
            ''', (payment_status, json.dumps(status_result), merchant_transaction_id))

            # Get payment record
            cursor.execute('SELECT booking_id FROM payments WHERE merchant_transaction_id = ?', (merchant_transaction_id,))
            payment_record = cursor.fetchone()
            
            if payment_record:
                booking_id = payment_record[0]
                
                # Update booking payment status
                if payment_status == 'COMPLETED':
                    cursor.execute('''
                        UPDATE bookings 
                        SET payment_status = 'paid', 
                            payment_amount = (SELECT amount FROM payments WHERE merchant_transaction_id = ?),
                            payment_date = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (merchant_transaction_id, booking_id))

                    # Credit referral earnings upon successful payment (idempotent)
                    try:
                        cursor.execute('SELECT referral_id, total_cost, base_package_cost, referral_earnings FROM bookings WHERE id = ?', (booking_id,))
                        br = cursor.fetchone()
                        if br:
                            ref_id = br[0]
                            total_cost_val = (br[1] or br[2] or 0) or 0
                            existing_ref_earn = br[3] or 0
                            if ref_id and existing_ref_earn == 0 and float(total_cost_val) > 0:
                                ref_earn = round(float(total_cost_val) * 0.125, 2)
                                # Persist on booking and add to referral's total_earnings
                                cursor.execute('UPDATE bookings SET referral_earnings = ? WHERE id = ?', (ref_earn, booking_id))
                                cursor.execute('UPDATE referrals SET total_earnings = total_earnings + ? WHERE id = ?', (ref_earn, ref_id))
                    except Exception as credit_ex:
                        print(f"Warning: failed to credit referral earnings on payment: {credit_ex}")
                
                conn.commit()
            
            conn.close()

            return jsonify({
                'success': True,
                'status': payment_status,
                'message': 'Payment status updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': status_result['error']
            }), 400

    except Exception as e:
        print(f"Error processing payment callback: {str(e)}")
        return jsonify({'message': 'Failed to process callback'}), 500

@app.route('/api/payment/status/<merchant_transaction_id>', methods=['GET'])
@token_required
def check_payment_status(current_user, merchant_transaction_id):
    """Check payment status for a specific transaction"""
    try:
        # Check status with PhonePe
        status_result = phonepe.check_payment_status(merchant_transaction_id)
        
        if status_result['success']:
            return jsonify(status_result)
        else:
            return jsonify({
                'success': False,
                'message': status_result['error']
            }), 400

    except Exception as e:
        print(f"Error checking payment status: {str(e)}")
        return jsonify({'message': 'Failed to check payment status'}), 500

@app.route('/api/payment/refund', methods=['POST'])
@token_required
def process_refund(current_user):
    """Process refund for a payment"""
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Only admins can process refunds'}), 403

    try:
        data = request.get_json()
        merchant_transaction_id = data.get('merchant_transaction_id')
        refund_amount = data.get('refund_amount')
        refund_note = data.get('refund_note', '')

        if not merchant_transaction_id or not refund_amount:
            return jsonify({'message': 'Merchant transaction ID and refund amount are required'}), 400

        # Process refund with PhonePe
        refund_result = phonepe.process_refund(merchant_transaction_id, refund_amount, refund_note)

        if refund_result['success']:
            # Update payment record
            conn = get_db()
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE payments 
                SET status = 'refunded', 
                    gateway_response = ?, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE merchant_transaction_id = ?
            ''', (json.dumps(refund_result), merchant_transaction_id))
            
            conn.commit()
            conn.close()

            return jsonify({
                'success': True,
                'message': 'Refund processed successfully',
                'refund_transaction_id': refund_result['refund_transaction_id']
            })
        else:
            return jsonify({
                'success': False,
                'message': refund_result['error']
            }), 400

    except Exception as e:
        print(f"Error processing refund: {str(e)}")
        return jsonify({'message': 'Failed to process refund'}), 500

# Application Management Endpoints
@app.route('/api/admin/applications/<application_type>', methods=['GET'])
@token_required
def get_applications(current_user, application_type):
    """Get all applications of a specific type"""
    try:
        # Validate application type
        valid_types = ['pilot', 'editor', 'referral', 'business_client']
        if application_type not in valid_types:
            return jsonify({'message': 'Invalid application type'}), 400

        conn = get_db()
        cursor = conn.cursor()

        table_name = f"{application_type}_applications"
        cursor.execute(f'SELECT * FROM {table_name} ORDER BY created_at DESC')
        applications = cursor.fetchall()

        # Convert to list of dictionaries
        applications_list = []
        for app in applications:
            app_dict = dict(app)
            applications_list.append(app_dict)

        conn.close()

        response = jsonify({
            'applications': applications_list,
            'count': len(applications_list)
        })
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error getting applications: {str(e)}")
        response = jsonify({'message': 'Failed to get applications'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/admin/applications/<application_type>/<int:application_id>/approve', methods=['POST'])
@token_required
def approve_application(current_user, application_type, application_id):
    """Approve an application and move to main table"""
    try:
        # Get admin comments from request
        data = request.get_json() or {}
        admin_comments = data.get('comments', '')

        # Validate application type
        valid_types = ['pilot', 'editor', 'referral', 'business_client']
        if application_type not in valid_types:
            return jsonify({'message': 'Invalid application type'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Get application data
        app_table = f"{application_type}_applications"
        cursor.execute(f'SELECT * FROM {app_table} WHERE id = ?', (application_id,))
        application = cursor.fetchone()

        if not application:
            conn.close()
            return jsonify({'message': 'Application not found'}), 404

        app_dict = dict(application)

        # Move to appropriate main table based on type
        if application_type == 'pilot':
            cursor.execute('''
                INSERT INTO pilots (
                    name, full_name, email, phone, password, password_hash, date_of_birth, gender, address,
                    government_id_proof, license_number, issuing_authority, license_issue_date,
                    license_expiry_date, drone_model, drone_serial, drone_uin, drone_category,
                    total_flying_hours, flight_records, insurance_policy, insurance_validity,
                    pilot_license_url, id_proof_url, training_certificate_url, photograph_url,
                    insurance_certificate_url, cities, experience, equipment, portfolio_url,
                    bank_account, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            ''', (
                app_dict['name'], app_dict['full_name'], app_dict['email'], app_dict['phone'],
                app_dict['password_hash'], app_dict['password_hash'], app_dict['date_of_birth'], app_dict['gender'], app_dict['address'],
                app_dict['government_id_proof'], app_dict['license_number'], app_dict['issuing_authority'],
                app_dict['license_issue_date'], app_dict['license_expiry_date'], app_dict['drone_model'],
                app_dict['drone_serial'], app_dict['drone_uin'], app_dict['drone_category'],
                app_dict['total_flying_hours'], app_dict['flight_records'], app_dict['insurance_policy'],
                app_dict['insurance_validity'], app_dict['pilot_license_url'], app_dict['id_proof_url'],
                app_dict['training_certificate_url'], app_dict['photograph_url'], app_dict['insurance_certificate_url'],
                app_dict['cities'], app_dict['experience'], app_dict['equipment'], app_dict['portfolio_url'],
                app_dict['bank_account']
            ))
        elif application_type == 'editor':
            cursor.execute('''
                INSERT INTO editors (name, full_name, email, phone, password_hash, role,
                                   years_experience, primary_skills, specialization,
                                   portfolio_url, time_zone, government_id_url, tax_gst_number, status, approval_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'approved')
            ''', (
                app_dict['full_name'], app_dict['full_name'], app_dict['email'], app_dict['phone'],
                app_dict['password_hash'], app_dict['role'], app_dict['years_experience'],
                app_dict['primary_skills'], app_dict['specialization'], app_dict['portfolio_url'],
                app_dict['time_zone'], app_dict['government_id_url'], app_dict['tax_gst_number']
            ))
        elif application_type == 'referral':
            # Add missing columns to referrals table if needed
            referral_columns = [row[1] for row in cursor.execute("PRAGMA table_info(referrals)").fetchall()]
            alter_stmts = []
            if 'category' not in referral_columns:
                alter_stmts.append("ALTER TABLE referrals ADD COLUMN category TEXT")
            if 'password_hash' not in referral_columns:
                alter_stmts.append("ALTER TABLE referrals ADD COLUMN password_hash TEXT")
            if 'city' not in referral_columns:
                alter_stmts.append("ALTER TABLE referrals ADD COLUMN city TEXT")
            if 'referral_source' not in referral_columns:
                alter_stmts.append("ALTER TABLE referrals ADD COLUMN referral_source TEXT")
            if 'business_types' not in referral_columns:
                alter_stmts.append("ALTER TABLE referrals ADD COLUMN business_types TEXT")
            if 'message' not in referral_columns:
                alter_stmts.append("ALTER TABLE referrals ADD COLUMN message TEXT")
            if 'referral_code' not in referral_columns:
                alter_stmts.append("ALTER TABLE referrals ADD COLUMN referral_code TEXT")
            if 'referral_link' not in referral_columns:
                alter_stmts.append("ALTER TABLE referrals ADD COLUMN referral_link TEXT")
            for stmt in alter_stmts:
                try:
                    cursor.execute(stmt)
                except Exception as e:
                    if "duplicate column name" not in str(e):
                        print(f"Error adding column: {e}")
            
            # Move referral application to referrals table with all fields
            cursor.execute('''
                INSERT INTO referrals (
                    name, email, phone, city, category, password_hash, referral_source, business_types, message,
                    referral_code, referral_link, status, commission_rate, total_earnings, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 12.5, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ''', (
                app_dict['name'], 
                app_dict['email'], 
                app_dict['phone'],
                app_dict.get('city', ''),
                app_dict.get('category', ''),
                app_dict.get('password_hash', ''),
                app_dict.get('referral_source', ''),
                app_dict.get('business_types', ''),
                app_dict.get('message', ''),
                app_dict.get('referral_code', ''),
                app_dict.get('referral_link', '')
            ))
        elif application_type == 'business_client':
            # Insert into business_clients table
            cursor.execute('''
                INSERT INTO business_clients (business_name, registration_number, organization_type,
                                            incorporation_date, official_address, official_email, phone,
                                            contact_name, contact_person_designation, email, password_hash,
                                            registration_certificate_url, tax_identification_url,
                                            business_license_url, address_proof_url, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            ''', (
                app_dict['business_name'], app_dict['registration_number'], app_dict['organization_type'],
                app_dict['incorporation_date'], app_dict['official_address'], app_dict['official_email'],
                app_dict['phone'], app_dict['contact_name'], app_dict['contact_person_designation'],
                app_dict['email'], app_dict['password_hash'], app_dict['registration_certificate_url'],
                app_dict['tax_identification_url'], app_dict['business_license_url'], app_dict['address_proof_url']
            ))

            # Also create a user record for authentication and client database display
            cursor.execute('''
                INSERT INTO users (email, password_hash, username, role, created_at,updated_at)
                VALUES (?, ?, ?, 'client',  CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
            ''', (
                app_dict['email'], app_dict['password_hash'], app_dict['contact_name']
            ))

        # Delete from applications table
        cursor.execute(f'DELETE FROM {app_table} WHERE id = ?', (application_id,))

        conn.commit()
        conn.close()

        # Send approval email
        try:
            applicant_name = app_dict.get('name') or app_dict.get('full_name') or 'Applicant'
            applicant_email = app_dict.get('email')

            if applicant_email:
                subject, body = get_application_approval_email(
                    applicant_name,
                    application_type.replace('_', ' ').title(),
                    admin_comments
                )
                send_email_async(applicant_email, subject, body)
                print(f"Approval email sent to {applicant_email}")
            else:
                print("No email address found for applicant")
        except Exception as e:
            print(f"Failed to send approval email: {str(e)}")

        response = jsonify({'message': f'{application_type.title()} application approved successfully'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error approving application: {str(e)}")
        response = jsonify({'message': 'Failed to approve application'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/admin/applications/<application_type>/<int:application_id>/reject', methods=['POST'])
@token_required
def reject_application(current_user, application_type, application_id):
    """Reject an application"""
    try:
        data = request.get_json() or {}
        admin_comments = data.get('comments', '')

        # Validate application type
        valid_types = ['pilot', 'editor', 'referral', 'business_client']
        if application_type not in valid_types:
            return jsonify({'message': 'Invalid application type'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Update application status to rejected
        app_table = f"{application_type}_applications"
        cursor.execute(f'''
            UPDATE {app_table}
            SET status = 'rejected', admin_comments = ?
            WHERE id = ?
        ''', (admin_comments, application_id))

        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'message': 'Application not found'}), 404

        # Get application details for email
        cursor.execute(f'SELECT * FROM {app_table} WHERE id = ?', (application_id,))
        app_row = cursor.fetchone()
        app_dict = dict(app_row) if app_row else {}

        conn.commit()
        conn.close()

        # Send rejection email
        try:
            applicant_name = app_dict.get('name') or app_dict.get('full_name') or 'Applicant'
            applicant_email = app_dict.get('email')

            if applicant_email:
                subject, body = get_application_rejection_email(
                    applicant_name,
                    application_type.replace('_', ' ').title(),
                    admin_comments
                )
                send_email_async(applicant_email, subject, body)
                print(f"Rejection email sent to {applicant_email}")
            else:
                print("No email address found for applicant")
        except Exception as e:
            print(f"Failed to send rejection email: {str(e)}")

        response = jsonify({'message': f'{application_type.title()} application rejected'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error rejecting application: {str(e)}")
        response = jsonify({'message': 'Failed to reject application'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

# Video Reviews API Endpoints

@app.route('/api/admin/video-reviews', methods=['GET'])
@token_required
def get_video_reviews(current_user):
    """Get video reviews for admin dashboard"""
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()

        # Get submission type filter
        submission_type = request.args.get('type', 'all')  # pilot, editor, or all

        base_query = '''
            SELECT vr.*,
                   b.id as booking_id,
                   u.username as client_name, u.email as client_email,
                   p.name as pilot_name, p.email as pilot_email,
                   e.name as editor_name, e.email as editor_email
            FROM video_reviews vr
            LEFT JOIN bookings b ON vr.order_id = b.id
            LEFT JOIN users u ON vr.client_id = u.id
            LEFT JOIN pilots p ON vr.pilot_id = p.id
            LEFT JOIN editors e ON vr.editor_id = e.id
        '''

        if submission_type == 'pilot':
            query = base_query + " WHERE vr.submission_type = 'pilot' ORDER BY vr.submitted_date DESC"
        elif submission_type == 'editor':
            query = base_query + " WHERE vr.submission_type = 'editor' ORDER BY vr.submitted_date DESC"
        else:
            query = base_query + " ORDER BY vr.submitted_date DESC"

        reviews = conn.execute(query).fetchall()
        conn.close()

        # Format the response
        reviews_list = []
        for review in reviews:
            review_dict = dict(review)
            reviews_list.append({
                'video_id': review_dict.get('video_id'),
                'order_id': review_dict.get('order_id'),
                'booking_id': f"HMX{review_dict.get('order_id', ''):04d}",
                'client_id': review_dict.get('client_id'),
                'client_name': review_dict.get('client_name', 'Unknown'),
                'client_email': review_dict.get('client_email', ''),
                'editor_id': review_dict.get('editor_id'),
                'editor_name': review_dict.get('editor_name', 'Unassigned'),
                'pilot_id': review_dict.get('pilot_id'),
                'pilot_name': review_dict.get('pilot_name', 'Unassigned'),
                'drive_link': review_dict.get('drive_link', ''),
                'submitted_date': review_dict.get('submitted_date', ''),
                'admin_comments': review_dict.get('admin_comments', ''),
                'pilot_comments': review_dict.get('pilot_comments', ''),
                'editor_comments': review_dict.get('editor_comments', ''),
                'status': review_dict.get('status', 'submitted'),
                'submission_type': review_dict.get('submission_type', 'pilot'),
                'created_at': review_dict.get('created_at', ''),
                'updated_at': review_dict.get('updated_at', '')
            })

        return jsonify(reviews_list)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/video-reviews/<int:video_id>', methods=['PUT'])
@token_required
def update_video_review(current_user, video_id):
    """Update video review status and comments"""
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()

        # Update video review
        update_fields = []
        update_values = []

        if 'status' in data:
            update_fields.append('status = ?')
            update_values.append(data['status'])

        if 'admin_comments' in data:
            update_fields.append('admin_comments = ?')
            update_values.append(data['admin_comments'])

        if update_fields:
            update_fields.append('updated_at = CURRENT_TIMESTAMP')
            update_values.append(video_id)

            query = f"UPDATE video_reviews SET {', '.join(update_fields)} WHERE video_id = ?"
            cursor.execute(query, update_values)

            # If status is being updated, also update bookings table
            if 'status' in data:
                # Get the order_id, submission_type, and drive_link for this video review
                cursor.execute('SELECT order_id, submission_type, drive_link, editor_id FROM video_reviews WHERE video_id = ?', (video_id,))
                result = cursor.fetchone()

                if result:
                    order_id, submission_type, drive_link, editor_id = result

                    # Update bookings table based on status and submission type
                    if data['status'] == 'forwarded_to_editor' and submission_type == 'pilot':
                        # When pilot video is forwarded to editor, update drive_link with latest pilot video
                        cursor.execute('''
                            UPDATE bookings
                            SET status = 'editing', drive_link = ?
                            WHERE id = ?
                        ''', (drive_link, order_id))
                        print(f"Updated booking {order_id} status to editing with pilot video link: {drive_link}")
                    elif data['status'] == 'approved' and submission_type == 'pilot':
                        # When admin approves pilot video, update drive_link with latest approved pilot video
                        cursor.execute('''
                            SELECT drive_link FROM video_reviews
                            WHERE order_id = ? AND submission_type = 'pilot' AND status = 'approved'
                            ORDER BY submitted_date DESC LIMIT 1
                        ''', (order_id,))

                        latest_approved = cursor.fetchone()
                        if latest_approved:
                            latest_drive_link = latest_approved[0]
                            cursor.execute('''
                                UPDATE bookings
                                SET drive_link = ?
                                WHERE id = ?
                            ''', (latest_drive_link, order_id))
                            print(f"Updated booking {order_id} drive_link with approved pilot video: {latest_drive_link}")
                        else:
                            # If no approved video found yet, use current video link
                            cursor.execute('''
                                UPDATE bookings
                                SET drive_link = ?
                                WHERE id = ?
                            ''', (drive_link, order_id))
                            print(f"Updated booking {order_id} drive_link with current pilot video: {drive_link}")
                    elif data['status'] == 'completed' and submission_type == 'editor':
                        # When marking editor video as completed, also update delivery link
                        cursor.execute('''
                            UPDATE bookings
                            SET status = 'completed', delivery_video_link = ?
                            WHERE id = ?
                        ''', (drive_link, order_id))
                        print(f"Updated booking {order_id} status to completed with video link: {drive_link}")
                    elif data['status'] == 'approved' and submission_type == 'editor':
                        # When admin approves editor video, update delivery_video_link with the latest approved video
                        # Get the latest approved video from this editor for this order
                        cursor.execute('''
                            SELECT drive_link FROM video_reviews
                            WHERE order_id = ? AND editor_id = ? AND submission_type = 'editor' AND status = 'approved'
                            ORDER BY submitted_date DESC
                            LIMIT 1
                        ''', (order_id, editor_id))

                        latest_approved = cursor.fetchone()
                        if latest_approved:
                            latest_drive_link = latest_approved[0]
                            # Update the booking with the latest approved video link and calculate earnings
                            cursor.execute('''
                                UPDATE bookings
                                SET delivery_video_link = ?, status = 'completed'
                                WHERE id = ?
                            ''', (latest_drive_link, order_id))
                            print(f"Updated booking {order_id} with approved video link: {latest_drive_link}")

                            # Calculate and update earnings when order is completed
                            cursor.execute('SELECT payment_amount, pilot_id, editor_id, referral_id FROM bookings WHERE id = ?', (order_id,))
                            booking_data = cursor.fetchone()
                            if booking_data and booking_data[0]:  # payment_amount exists
                                payment_amount = booking_data[0]
                                pilot_id = booking_data[1]
                                editor_id = booking_data[2]
                                referral_id = booking_data[3]

                                # Calculate earnings for each party
                                pilot_earnings = calculate_earnings(payment_amount, 'pilot')
                                editor_earnings = calculate_earnings(payment_amount, 'editor')
                                referral_earnings = calculate_earnings(payment_amount, 'referral') if referral_id else 0
                                hmx_earnings = calculate_earnings(payment_amount, 'hmx')
                                gateway_fees = calculate_earnings(payment_amount, 'payment_gateway')

                                # Update earnings in bookings table
                                cursor.execute('''
                                    UPDATE bookings
                                    SET pilot_earnings = ?, editor_earnings = ?, referral_earnings = ?,
                                        hmx_earnings = ?, gateway_fees = ?
                                    WHERE id = ?
                                ''', (pilot_earnings, editor_earnings, referral_earnings, hmx_earnings, gateway_fees, order_id))

                                print(f"Calculated earnings for order {order_id}: Pilot: ₹{pilot_earnings}, Editor: ₹{editor_earnings}, Referral: ₹{referral_earnings}")
                        else:
                            # If no approved video found yet, just update with current video link
                            cursor.execute('''
                                UPDATE bookings
                                SET delivery_video_link = ?, status = 'completed'
                                WHERE id = ?
                            ''', (drive_link, order_id))
                            print(f"Updated booking {order_id} with current video link: {drive_link}")

            conn.commit()

        conn.close()
        return jsonify({'message': 'Video review updated successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/video-submissions', methods=['GET', 'POST'])
@token_required
def pilot_video_submissions(current_user):
    """Handle pilot video submissions"""
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()

        if request.method == 'GET':
            # Get pilot's video submissions
            cursor = conn.cursor()
            cursor.execute('''
                SELECT vr.*, b.id as booking_id,
                       u.username as client_name
                FROM video_reviews vr
                LEFT JOIN bookings b ON vr.order_id = b.id
                LEFT JOIN users u ON vr.client_id = u.id
                WHERE vr.pilot_id = ? AND vr.submission_type = 'pilot'
                ORDER BY vr.submitted_date DESC
            ''', (current_user['user_id'],))

            submissions = cursor.fetchall()
            conn.close()

            submissions_list = []
            for submission in submissions:
                sub_dict = dict(submission)
                submissions_list.append({
                    'video_id': sub_dict.get('video_id'),
                    'order_id': sub_dict.get('order_id'),
                    'booking_id': f"HMX{sub_dict.get('order_id', ''):04d}",
                    'client_name': sub_dict.get('client_name', 'Unknown'),
                    'drive_link': sub_dict.get('drive_link', ''),
                    'pilot_comments': sub_dict.get('pilot_comments', ''),
                    'admin_comments': sub_dict.get('admin_comments', ''),
                    'status': sub_dict.get('status', 'submitted'),
                    'submitted_date': sub_dict.get('submitted_date', '')
                })

            return jsonify(submissions_list)

        elif request.method == 'POST':
            # Create new pilot video submission
            data = request.json
            cursor = conn.cursor()

            order_id = data.get('order_id')

            # Auto-fill client_id from the booking
            cursor.execute('SELECT user_id FROM bookings WHERE id = ?', (order_id,))
            booking = cursor.fetchone()

            if not booking:
                return jsonify({'message': 'Booking not found'}), 404

            client_id = booking['user_id']
            print(f"Auto-filling client_id: {client_id} for pilot submission on order {order_id}")

            cursor.execute('''
                INSERT INTO video_reviews (
                    order_id, client_id, pilot_id, drive_link, pilot_comments,
                    submission_type, status
                ) VALUES (?, ?, ?, ?, ?, 'pilot', 'submitted')
            ''', (
                order_id,
                client_id,
                current_user['user_id'],
                data.get('drive_link'),
                data.get('pilot_comments', '')
            ))

            conn.commit()
            conn.close()

            return jsonify({'message': 'Video submitted successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/video-submissions', methods=['GET', 'POST'])
@token_required
def editor_video_submissions(current_user):
    """Handle editor video submissions"""
    if current_user['role'] != 'editor':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()

        if request.method == 'GET':
            # Get editor's video submissions
            cursor = conn.cursor()
            cursor.execute('''
                SELECT vr.*, b.id as booking_id,
                       u.username as client_name
                FROM video_reviews vr
                LEFT JOIN bookings b ON vr.order_id = b.id
                LEFT JOIN users u ON vr.client_id = u.id
                WHERE vr.editor_id = ? AND vr.submission_type = 'editor'
                ORDER BY vr.submitted_date DESC
            ''', (current_user['user_id'],))

            submissions = cursor.fetchall()
            conn.close()

            submissions_list = []
            for submission in submissions:
                sub_dict = dict(submission)
                submissions_list.append({
                    'video_id': sub_dict.get('video_id'),
                    'order_id': sub_dict.get('order_id'),
                    'booking_id': f"HMX{sub_dict.get('order_id', ''):04d}",
                    'client_name': sub_dict.get('client_name', 'Unknown'),
                    'drive_link': sub_dict.get('drive_link', ''),
                    'editor_comments': sub_dict.get('editor_comments', ''),
                    'admin_comments': sub_dict.get('admin_comments', ''),
                    'status': sub_dict.get('status', 'submitted'),
                    'submitted_date': sub_dict.get('submitted_date', '')
                })

            return jsonify(submissions_list)

        elif request.method == 'POST':
            # Create new editor video submission
            data = request.json
            cursor = conn.cursor()

            order_id = data.get('order_id')

            # Auto-fill client_id and pilot_id from the booking
            cursor.execute('SELECT user_id, pilot_id FROM bookings WHERE id = ?', (order_id,))
            booking = cursor.fetchone()

            if not booking:
                return jsonify({'message': 'Booking not found'}), 404

            client_id = booking['user_id']
            pilot_id = booking['pilot_id']
            print(f"Auto-filling client_id: {client_id}, pilot_id: {pilot_id} for editor submission on order {order_id}")

            cursor.execute('''
                INSERT INTO video_reviews (
                    order_id, client_id, editor_id, pilot_id, drive_link, editor_comments,
                    submission_type, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'editor', 'submitted')
            ''', (
                order_id,
                client_id,
                current_user['user_id'],
                pilot_id,
                data.get('drive_link'),
                data.get('editor_comments', '')
            ))

            conn.commit()
            conn.close()

            return jsonify({'message': 'Edited video submitted successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/assigned-orders', methods=['GET'])
@token_required
def get_pilot_assigned_orders(current_user):
    """Get ALL orders assigned to pilot for dashboard"""
    print(f"Pilot assigned orders - current_user: {current_user}")

    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        print(f"Fetching orders for pilot ID: {current_user['user_id']}")

        # Get ALL orders assigned to this pilot (for dashboard)
        cursor.execute('''
            SELECT b.*, u.username as client_name, u.email as client_email,
                   e.name as editor_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN editors e ON b.editor_id = e.id
            WHERE b.pilot_id = ?
            ORDER BY b.created_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'booking_id': f"HMX{order_dict.get('id', ''):04d}",
                'user_id': order_dict.get('user_id'),
                'client_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'editor_id': order_dict.get('editor_id'),
                'editor_name': order_dict.get('editor_name', 'Unassigned'),
                'status': order_dict.get('status'),
                'preferred_date': order_dict.get('preferred_date', ''),
                'location_address': order_dict.get('location_address', ''),
                'gps_link': order_dict.get('gps_link',''),
                'property_type': order_dict.get('property_type', ''),
                'payment_amount': order_dict.get('payment_amount'),
                'payment_status': order_dict.get('payment_status'),
                'delivery_video_link': order_dict.get('delivery_video_link'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        print(f"Returning {len(orders_list)} orders")
        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_pilot_assigned_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/ongoing-orders', methods=['GET'])
@token_required
def get_editor_ongoing_orders(current_user):
    """Get ongoing orders for the logged-in editor (not completed, cancelled, or rejected)"""
    print(f"Editor ongoing orders - current_user: {current_user}")

    if current_user['role'] != 'editor':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get ongoing bookings assigned to this editor
        cursor.execute('''
            SELECT b.*, u.username as client_name, u.email as client_email
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.editor_id = ? AND UPPER(b.status) NOT IN ('COMPLETED', 'CANCELLED', 'REJECTED')
            ORDER BY b.preferred_date ASC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_id': order_dict.get('user_id'),
                'pilot_id': order_dict.get('pilot_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'preferred_date': order_dict.get('preferred_date'),
                'payment_amount': order_dict.get('payment_amount'),
                'created_at': order_dict.get('created_at')
            })

        print(f"Returning {len(orders_list)} ongoing orders for editor")
        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_editor_ongoing_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/completed-orders', methods=['GET'])
@token_required
def get_editor_completed_orders(current_user):
    """Get completed orders for the logged-in editor"""

    # Handle preflight request
    print(f"\n=== EDITOR COMPLETED ORDERS DEBUG ===")
    print(f"Current user data: {current_user}")
    print(f"User ID: {current_user.get('user_id', 'NOT_FOUND')}")
    print(f"User role: {current_user.get('role', 'NOT_FOUND')}")

    if current_user['role'] != 'editor':
        print(f"❌ AUTHORIZATION FAILED: Expected role 'editor', got '{current_user['role']}'")
        response = jsonify({'message': f'Unauthorized - Role is {current_user["role"]}, expected editor'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 403

    print(f"✅ AUTHORIZATION PASSED: User is an editor")

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get only completed bookings assigned to this editor
        cursor.execute('''
            SELECT b.*, u.username as client_name, u.email as client_email
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.editor_id = ? AND UPPER(b.status) = 'COMPLETED'
            ORDER BY b.updated_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'payment_status': order_dict.get('payment_status'),
                'payment_amount': order_dict.get('payment_amount'),
                'delivery_video_link': order_dict.get('delivery_video_link'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        print(f"Returning {len(orders_list)} completed orders for editor")
        response = jsonify(orders_list)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error in get_editor_completed_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/editor/cancelled-orders', methods=['GET'])
@token_required
def get_editor_cancelled_orders(current_user):
    """Get cancelled/rejected orders for the logged-in editor"""
    print(f"\n=== EDITOR CANCELLED ORDERS DEBUG ===")
    print(f"Current user data: {current_user}")
    print(f"User ID: {current_user.get('user_id', 'NOT_FOUND')}")
    print(f"User role: {current_user.get('role', 'NOT_FOUND')}")

    if current_user['role'] != 'editor':
        print(f"❌ AUTHORIZATION FAILED: Expected role 'editor', got '{current_user['role']}'")
        return jsonify({'message': f'Unauthorized - Role is {current_user["role"]}, expected editor'}), 403

    print(f"✅ AUTHORIZATION PASSED: User is an editor")

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get cancelled/rejected bookings assigned to this editor
        cursor.execute('''
            SELECT b.*, u.username as client_name, u.email as client_email
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.editor_id = ? AND UPPER(b.status) IN ('CANCELLED', 'REJECTED')
            ORDER BY b.updated_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        print(f"Returning {len(orders_list)} cancelled orders for editor")
        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_editor_cancelled_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/submission-history/<int:order_id>', methods=['GET'])
@token_required
def get_editor_submission_history(current_user, order_id):
    """Get submission history for a specific order"""
    if current_user['role'] != 'editor':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get all video submissions for this order by this editor
        cursor.execute('''
            SELECT vr.*, b.id as booking_id
            FROM video_reviews vr
            LEFT JOIN bookings b ON vr.order_id = b.id
            WHERE vr.order_id = ? AND vr.editor_id = ? AND vr.submission_type = 'editor'
            ORDER BY vr.submitted_date DESC
        ''', (order_id, current_user['user_id']))

        submissions = cursor.fetchall()
        conn.close()

        submissions_list = []
        for submission in submissions:
            sub_dict = dict(submission)
            submissions_list.append({
                'video_id': sub_dict.get('video_id'),
                'order_id': sub_dict.get('order_id'),
                'drive_link': sub_dict.get('drive_link'),
                'editor_comments': sub_dict.get('editor_comments'),
                'admin_comments': sub_dict.get('admin_comments'),
                'status': sub_dict.get('status'),
                'submitted_date': sub_dict.get('submitted_date')
            })

        return jsonify(submissions_list)

    except Exception as e:
        print(f"Error in get_editor_submission_history: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/video-submissions', methods=['POST'])
@token_required
def submit_editor_video(current_user):
    """Submit a new video by editor"""
    if current_user['role'] != 'editor':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        data = request.get_json()
        order_id = data.get('order_id')
        drive_link = data.get('drive_link')
        editor_comments = data.get('editor_comments', '')

        if not order_id or not drive_link:
            return jsonify({'message': 'Order ID and drive link are required'}), 400

        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get client_id and pilot_id from the booking
        cursor.execute('SELECT user_id, pilot_id FROM bookings WHERE id = ?', (order_id,))
        booking = cursor.fetchone()

        if not booking:
            return jsonify({'message': 'Booking not found'}), 404

        client_id = booking['user_id']
        pilot_id = booking['pilot_id']

        print(f"Auto-filling client_id: {client_id}, pilot_id: {pilot_id} for order {order_id}")

        # Insert new video submission with auto-filled client_id and pilot_id
        cursor.execute('''
            INSERT INTO video_reviews (
                order_id, client_id, editor_id, pilot_id, submission_type, drive_link,
                editor_comments, status, submitted_date
            ) VALUES (?, ?, ?, ?, 'editor', ?, ?, 'submitted', ?)
        ''', (
            order_id,
            client_id,
            current_user['user_id'],
            pilot_id,
            drive_link,
            editor_comments,
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Video submitted successfully'}), 201

    except Exception as e:
        print(f"Error in submit_editor_video: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500



@app.route('/api/pilot/submission-history/<int:order_id>', methods=['GET'])
@token_required
def get_pilot_submission_history(current_user, order_id):
    """Get submission history for a specific order"""
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get all video submissions for this order by this pilot
        cursor.execute('''
            SELECT vr.*, b.id as booking_id
            FROM video_reviews vr
            LEFT JOIN bookings b ON vr.order_id = b.id
            WHERE vr.order_id = ? AND vr.pilot_id = ? AND vr.submission_type = 'pilot'
            ORDER BY vr.submitted_date DESC
        ''', (order_id, current_user['user_id']))

        submissions = cursor.fetchall()
        conn.close()

        submissions_list = []
        for submission in submissions:
            sub_dict = dict(submission)
            submissions_list.append({
                'video_id': sub_dict.get('video_id'),
                'order_id': sub_dict.get('order_id'),
                'drive_link': sub_dict.get('drive_link'),
                'pilot_comments': sub_dict.get('pilot_comments'),
                'admin_comments': sub_dict.get('admin_comments'),
                'status': sub_dict.get('status'),
                'submitted_date': sub_dict.get('submitted_date')
            })

        return jsonify(submissions_list)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/all-orders', methods=['GET'])
@token_required
def get_pilot_all_orders(current_user):
    """Get ALL orders for the logged-in pilot"""
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get ALL bookings assigned to this pilot
        cursor.execute('''
            SELECT b.*, u.username as client_name, u.email as client_email, u.business_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.pilot_id = ?
            ORDER BY b.created_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_id': order_dict.get('user_id'),
                'editor_id': order_dict.get('editor_id'),
                'client_name': order_dict.get('client_name') or order_dict.get('business_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'preferred_date': order_dict.get('preferred_date'),
                'payment_amount': order_dict.get('payment_amount'),
                'payment_status': order_dict.get('payment_status'),
                'delivery_video_link': order_dict.get('delivery_video_link'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_pilot_all_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500




@app.route('/api/pilot/completed-orders', methods=['GET'])
@token_required
def get_pilot_completed_orders(current_user):
    """Get completed orders for the logged-in pilot"""
    print(f"Pilot completed orders - current_user: {current_user}")

    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get only completed bookings assigned to this pilot
        cursor.execute('''
            SELECT b.*, u.username as client_name, u.email as client_email, u.business_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.pilot_id = ? AND b.status = 'completed'
            ORDER BY b.updated_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name') or order_dict.get('business_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'payment_status': order_dict.get('payment_status'),
                'payment_amount': order_dict.get('payment_amount'),
                'delivery_video_link': order_dict.get('delivery_video_link'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_pilot_completed_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/cancelled-orders', methods=['GET'])
@token_required
def get_pilot_cancelled_orders(current_user):
    """Get cancelled/rejected orders for the logged-in pilot"""
    print(f"Pilot cancelled orders - current_user: {current_user}")

    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get cancelled/rejected bookings assigned to this pilot
        cursor.execute('''
            SELECT b.*, u.username as client_name, u.email as client_email, u.business_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.pilot_id = ? AND b.status IN ('cancelled', 'rejected')
            ORDER BY b.updated_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'user_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name') or order_dict.get('business_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'location_address': order_dict.get('location_address'),
                'status': order_dict.get('status'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        return jsonify(orders_list)

    except Exception as e:
        print(f"Error in get_pilot_cancelled_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/final-review', methods=['GET'])
@token_required
def get_pilot_final_review(current_user):
    """Get orders ready for pilot final review"""
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get orders where editor has submitted final video and waiting for pilot approval
        cursor.execute('''
            SELECT b.*, u.username as client_name, u.email as client_email,
                   vr.drive_link as final_video_link
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN video_reviews vr ON b.id = vr.order_id
                AND vr.submission_type = 'editor'
                AND vr.status = 'submitted'
            WHERE b.pilot_id = ? AND b.status = 'final_review'
            ORDER BY b.preferred_date ASC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'client_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'status': order_dict.get('status'),
                'final_video_link': order_dict.get('final_video_link')
            })

        return jsonify(orders_list)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pilot/earnings', methods=['GET'])
@token_required
def get_pilot_earnings(current_user):
    """Get pilot earnings summary"""
    if current_user['role'] != 'pilot':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        pilot_id = current_user['user_id']

        # Get total earnings
        cursor.execute('''
            SELECT
                COALESCE(SUM(pilot_earnings), 0) as total_earnings,
                COUNT(*) as completed_orders,
                COALESCE(AVG(pilot_earnings), 0) as avg_earnings_per_order
            FROM bookings
            WHERE pilot_id = ? AND status = 'completed' AND pilot_earnings IS NOT NULL
        ''', (pilot_id,))

        earnings_data = cursor.fetchone()

        # Get monthly earnings for current year
        cursor.execute('''
            SELECT
                strftime('%m', completed_date) as month,
                COALESCE(SUM(pilot_earnings), 0) as monthly_earnings,
                COUNT(*) as monthly_orders
            FROM bookings
            WHERE pilot_id = ? AND status = 'completed'
            AND strftime('%Y', completed_date) = strftime('%Y', 'now')
            AND pilot_earnings IS NOT NULL
            GROUP BY strftime('%m', completed_date)
            ORDER BY month
        ''', (pilot_id,))

        monthly_data = cursor.fetchall()

        # Get recent completed orders with earnings
        cursor.execute('''
            SELECT
                id, payment_amount, pilot_earnings, completed_date,
                property_type, location_address
            FROM bookings
            WHERE pilot_id = ? AND status = 'completed' AND pilot_earnings IS NOT NULL
            ORDER BY completed_date DESC
            LIMIT 10
        ''', (pilot_id,))

        recent_orders = cursor.fetchall()

        conn.close()

        return jsonify({
            'total_earnings': earnings_data[0] if earnings_data else 0,
            'completed_orders': earnings_data[1] if earnings_data else 0,
            'avg_earnings_per_order': earnings_data[2] if earnings_data else 0,
            'monthly_earnings': [
                {
                    'month': row[0],
                    'earnings': row[1],
                    'orders': row[2]
                } for row in monthly_data
            ],
            'recent_orders': [
                {
                    'id': row[0],
                    'payment_amount': row[1],
                    'pilot_earnings': row[2],
                    'completed_date': row[3],
                    'property_type': row[4],
                    'location': row[5]
                } for row in recent_orders
            ]
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/editor/assigned-orders', methods=['GET'])
@token_required
def get_editor_assigned_orders(current_user):
    """Get ALL orders assigned to editor for dashboard"""

    # Handle preflight request
    print(f"\n=== EDITOR ASSIGNED ORDERS DEBUG ===")
    print(f"Current user data: {current_user}")
    print(f"User ID: {current_user.get('user_id', 'NOT_FOUND')}")
    print(f"User role: {current_user.get('role', 'NOT_FOUND')}")
    print(f"User email: {current_user.get('email', 'NOT_FOUND')}")
    print(f"User name: {current_user.get('name', 'NOT_FOUND')}")

    if current_user['role'] != 'editor':
        print(f"❌ AUTHORIZATION FAILED: Expected role 'editor', got '{current_user['role']}'")
        response = jsonify({'message': f'Unauthorized - Role is {current_user["role"]}, expected editor'})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 403

    print(f"✅ AUTHORIZATION PASSED: User is an editor")

    try:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        print(f"Fetching orders for editor ID: {current_user['user_id']}")

        # Get ALL orders assigned to this editor (for dashboard)
        cursor.execute('''
            SELECT b.*, u.username as client_name, u.email as client_email,
                   p.name as pilot_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN pilots p ON b.pilot_id = p.id
            WHERE b.editor_id = ?
            ORDER BY b.created_at DESC
        ''', (current_user['user_id'],))

        orders = cursor.fetchall()
        conn.close()

        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append({
                'id': order_dict.get('id'),
                'booking_id': f"HMX{order_dict.get('id', ''):04d}",
                'user_id': order_dict.get('user_id'),
                'client_id': order_dict.get('user_id'),
                'client_name': order_dict.get('client_name', 'Unknown'),
                'client_email': order_dict.get('client_email', ''),
                'pilot_id': order_dict.get('pilot_id'),
                'pilot_name': order_dict.get('pilot_name', 'Unknown'),
                'status': order_dict.get('status'),
                'preferred_date': order_dict.get('preferred_date', ''),
                'location_address': order_dict.get('location_address', ''),
                'property_type': order_dict.get('property_type', ''),
                'payment_amount': order_dict.get('payment_amount'),
                'payment_status': order_dict.get('payment_status'),
                'delivery_video_link': order_dict.get('delivery_video_link'),
                'delivery_drive_link': order_dict.get('delivery_drive_link'),
                'updated_at': order_dict.get('updated_at'),
                'created_at': order_dict.get('created_at')
            })

        print(f"Returning {len(orders_list)} orders for editor")
        response = jsonify(orders_list)
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error in get_editor_assigned_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', get_cors_origin())
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/editor/earnings', methods=['GET'])
@token_required
def get_editor_earnings(current_user):
    """Get editor earnings summary"""
    if current_user['role'] != 'editor':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        editor_id = current_user['user_id']

        # Get total earnings
        cursor.execute('''
            SELECT
                COALESCE(SUM(editor_earnings), 0) as total_earnings,
                COUNT(*) as completed_orders,
                COALESCE(AVG(editor_earnings), 0) as avg_earnings_per_order
            FROM bookings
            WHERE editor_id = ? AND status = 'completed' AND editor_earnings IS NOT NULL
        ''', (editor_id,))

        earnings_data = cursor.fetchone()

        # Get monthly earnings for current year
        cursor.execute('''
            SELECT
                strftime('%m', completed_date) as month,
                COALESCE(SUM(editor_earnings), 0) as monthly_earnings,
                COUNT(*) as monthly_orders
            FROM bookings
            WHERE editor_id = ? AND status = 'completed'
            AND strftime('%Y', completed_date) = strftime('%Y', 'now')
            AND editor_earnings IS NOT NULL
            GROUP BY strftime('%m', completed_date)
            ORDER BY month
        ''', (editor_id,))

        monthly_data = cursor.fetchall()

        # Get recent completed orders with earnings
        cursor.execute('''
            SELECT
                id, payment_amount, editor_earnings, completed_date,
                property_type, location_address
            FROM bookings
            WHERE editor_id = ? AND status = 'completed' AND editor_earnings IS NOT NULL
            ORDER BY completed_date DESC
            LIMIT 10
        ''', (editor_id,))

        recent_orders = cursor.fetchall()

        conn.close()

        return jsonify({
            'total_earnings': earnings_data[0] if earnings_data else 0,
            'completed_orders': earnings_data[1] if earnings_data else 0,
            'avg_earnings_per_order': earnings_data[2] if earnings_data else 0,
            'monthly_earnings': [
                {
                    'month': row[0],
                    'earnings': row[1],
                    'orders': row[2]
                } for row in monthly_data
            ],
            'recent_orders': [
                {
                    'id': row[0],
                    'payment_amount': row[1],
                    'editor_earnings': row[2],
                    'completed_date': row[3],
                    'property_type': row[4],
                    'location': row[5]
                } for row in recent_orders
            ]
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/pilots/create', methods=['POST'])
@token_required
def add_pilot_direct(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        data = request.get_json()
        conn = get_db()
        cursor = conn.cursor()

        # Hash the password
        password = data.get('password', 'pilot123')
        password_hash = generate_password_hash(password)

        cursor.execute('''
            INSERT INTO pilots (
                name, full_name, email, phone, password_hash, date_of_birth, gender, address,
                license_number, issuing_authority, license_issue_date, license_expiry_date,
                drone_model, drone_serial, drone_uin, drone_category, total_flying_hours,
                insurance_policy, insurance_validity, government_id_proof,
                pilot_license_url, id_proof_url, training_certificate_url, photograph_url,
                insurance_certificate_url, portfolio_url, cities, experience, equipment,
                flight_records, bank_account, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('name'), data.get('full_name'), data.get('email'), data.get('phone'),
            password_hash, data.get('date_of_birth'), data.get('gender'), data.get('address'),
            data.get('license_number'), data.get('issuing_authority'), data.get('license_issue_date'),
            data.get('license_expiry_date'), data.get('drone_model'), data.get('drone_serial'),
            data.get('drone_uin'), data.get('drone_category'), data.get('total_flying_hours'),
            data.get('insurance_policy'), data.get('insurance_validity'), data.get('government_id_proof'),
            data.get('pilot_license_url'), data.get('id_proof_url'), data.get('training_certificate_url'),
            data.get('photograph_url'), data.get('insurance_certificate_url'), data.get('portfolio_url'),
            data.get('cities'), data.get('experience'), data.get('equipment'),
            data.get('flight_records'), data.get('bank_account'), data.get('status', 'active')
        ))

        conn.commit()
        conn.close()

        # Send via template system
        send_email_with_template_helper(
            to_email=data.get('email'),
            template_name="pilot_credentials",
            variables={
                "name": data.get('full_name') or data.get('name'),
                "email": data.get('email'),
                "password": password
            }
        )

        return jsonify({'message': 'Pilot added successfully'}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/editors/create', methods=['POST'])
@token_required
def add_editor_direct(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        data = request.get_json()
        conn = get_db()
        cursor = conn.cursor()

        # Hash the password
        password = data.get('password', 'editor123')
        password_hash = generate_password_hash(password)

        cursor.execute('''
            INSERT INTO editors (
                name, full_name, email, phone, password_hash, role, years_experience,
                primary_skills, specialization, portfolio_url, time_zone,
                government_id_url, tax_gst_number, status, approval_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('name'), data.get('full_name'), data.get('email'), data.get('phone'),
            password_hash, data.get('role'), data.get('years_experience'),
            data.get('primary_skills'), data.get('specialization'), data.get('portfolio_url'),
            data.get('time_zone'), data.get('government_id_url'), data.get('tax_gst_number'),
            data.get('status', 'active'), data.get('approval_status', 'approved')
        ))

        conn.commit()
        conn.close()

        # Send via template system
        send_email_with_template_helper(
            to_email=data.get('email'),
            template_name="editor_credentials",
            variables={
                "name": data.get('full_name') or data.get('name'),
                "email": data.get('email'),
                "password": password
            }
        )

        return jsonify({'message': 'Editor added successfully'}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/referrals/create', methods=['POST'])
@token_required
def add_referral_direct(current_user):
    """Add referral directly to main referrals table"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        data = request.get_json()
        conn = get_db()
        cursor = conn.cursor()

        # Generate or use provided password
        password = data.get('password', 'referral123')
        password_hash = generate_password_hash(password)

        cursor.execute('''
            INSERT INTO referrals (
                name, email, phone, status, commission_rate, total_earnings, password_hash, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('name'), data.get('email'), data.get('phone'),
            data.get('status', 'active'), data.get('commission_rate', 10.0),
            data.get('total_earnings', 0.0), password_hash, datetime.now()
        ))

        conn.commit()
        conn.close()

        # Send welcome + credentials email
        if data.get('email'):
            send_email_with_template_helper(
                to_email=data['email'],
                template_name="referral_credentials",
                variables={
                    "name": data.get('name') or "Referral Partner",
                    "email": data.get('email'),
                    "password": password
                }
            )

        return jsonify({'message': 'Referral added successfully'}), 201

    except Exception as e:
        print(f"Error adding referral: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/bookings', methods=['POST'])
@token_required
def add_booking_direct(current_user):
    """Add booking directly to main bookings table"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        data = request.get_json()
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO bookings (
                user_id, pilot_id, editor_id, referral_id, property_type, category,
                preferred_date, location, duration, requirements, status,
                admin_comments, pilot_notes, client_notes, payment_status,
                payment_amount, drive_link, property_type, location_address,
                preferred_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('user_id') or None, data.get('pilot_id') or None,
            data.get('editor_id') or None, data.get('referral_id') or None,
            data.get('property_type'), data.get('category'), data.get('preferred_date'),
            data.get('location'), data.get('duration'), data.get('requirements'),
            data.get('status', 'pending'), data.get('admin_comments'),
            data.get('pilot_notes'), data.get('client_notes'),
            data.get('payment_status', 'pending'), data.get('payment_amount'),
            data.get('drive_link'), data.get('property_type'),
            data.get('location_address'), data.get('preferred_time')
        ))

        booking_id = cursor.lastrowid
        conn.commit()
        conn.close()

        # ✅ Notify client about booking
        try:
            # Get client email
            client_email = None
            client_name = "User"
            if data.get('user_id'):
                conn = get_db()
                c2 = conn.cursor()
                c2.execute("SELECT email, contact_name, business_name FROM users WHERE id = ?", (data['user_id'],))
                u = c2.fetchone()
                conn.close()
                if u:
                    client_email = u['email']
                    client_name = u['contact_name'] or u['business_name'] or "User"

            if client_email:
                send_email_with_template_helper(
                    to_email=client_email,
                    template_name="order_created",
                    variables={
                        "name": client_name,
                        "booking_id": booking_id,
                        "location": data.get("location") or data.get("location_address", ""),
                        "date": data.get("preferred_date", "")
                    }
                )
        except Exception as e:
            print(f"Failed to send booking notification: {str(e)}")

        return jsonify({'message': 'Order added successfully', 'booking_id': booking_id}), 201

    except Exception as e:
        print(f"Error adding order: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Password management endpoints
@app.route('/api/auth/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    """Allow users to change their password"""
    try:
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Get user's current password hash based on role
        if current_user['role'] == 'pilot':
            cursor.execute('SELECT password_hash FROM pilots WHERE id = ?', (current_user['user_id'],))
        elif current_user['role'] == 'editor':
            cursor.execute('SELECT password_hash FROM editors WHERE id = ?', (current_user['user_id'],))
        else:
            cursor.execute('SELECT password_hash FROM users WHERE id = ?', (current_user['user_id'],))

        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({'error': 'User not found'}), 404

        # Verify current password
        if not check_password_hash(user_data['password_hash'], current_password):
            return jsonify({'error': 'Current password is incorrect'}), 400

        # Hash new password
        new_password_hash = generate_password_hash(new_password)

        # Update password based on role
        if current_user['role'] == 'pilot':
            cursor.execute('UPDATE pilots SET password_hash = ? WHERE id = ?',
                         (new_password_hash, current_user['user_id']))
        elif current_user['role'] == 'editor':
            cursor.execute('UPDATE editors SET password_hash = ? WHERE id = ?',
                         (new_password_hash, current_user['user_id']))
        else:
            cursor.execute('UPDATE users SET password_hash = ? WHERE id = ?',
                         (new_password_hash, current_user['user_id']))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Password changed successfully'}), 200

    except Exception as e:
        print(f"Error changing password: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password_via_otp():
    """
    Reset password for users based on verified OTP.
    Special case: business_clients -> update both business_clients and users.
    """
    try:
        data = request.get_json()
        email = data.get('email')
        new_password = data.get('new_password')

        if not email or not new_password:
            return jsonify({'error': 'Email and new password are required'}), 400

        conn = get_db()
        cursor = conn.cursor()

        hashed_pw = generate_password_hash(new_password)
        updated = False

        # 1️⃣ Check business_clients
        cursor.execute('SELECT id FROM business_clients WHERE email = ?', (email,))
        row = cursor.fetchone()
        if row:
            user_id = row[0]
            cursor.execute('UPDATE business_clients SET password_hash = ? WHERE id = ?', (hashed_pw, user_id))
            cursor.execute('UPDATE users SET password_hash = ? WHERE email = ?', (hashed_pw, email))
            updated = True

        # 2️⃣ Check pilots
        if not updated:
            cursor.execute('SELECT id FROM pilots WHERE email = ?', (email,))
            row = cursor.fetchone()
            if row:
                user_id = row[0]
                cursor.execute('UPDATE pilots SET password_hash = ? WHERE id = ?', (hashed_pw, user_id))
                updated = True

        # 3️⃣ Check editors
        if not updated:
            cursor.execute('SELECT id FROM editors WHERE email = ?', (email,))
            row = cursor.fetchone()
            if row:
                user_id = row[0]
                cursor.execute('UPDATE editors SET password_hash = ? WHERE id = ?', (hashed_pw, user_id))
                updated = True

        # 4️⃣ Check referrals
        if not updated:
            cursor.execute('SELECT id FROM referrals WHERE email = ?', (email,))
            row = cursor.fetchone()
            if row:
                user_id = row[0]
                cursor.execute('UPDATE referrals SET password_hash = ? WHERE id = ?', (hashed_pw, user_id))
                updated = True

        if not updated:
            conn.close()
            return jsonify({'error': 'User not found'}), 404

        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Password reset successfully'}), 200

    except Exception as e:
        print(f"Error resetting password: {str(e)}")
        return jsonify({'error': str(e)}), 500



@app.route('/api/auth/request-otp', methods=['POST'])
def request_otp():
    try:
        data = request.get_json()
        email = data.get('email')
        user_type = data.get('user_type')
        user_data = data.get('user_data', {})  # optional extra signup data

        if not email or not user_type:
            return jsonify({'success': False, 'error': 'Missing email or user_type'}), 400

        otp = store_otp(email, user_type, user_data)
        if not otp:
            return jsonify({'success': False, 'error': 'Failed to generate OTP'}), 500

        _otp_logger.info(f"OTP for {email} ({user_type}): {otp}")

        # 🔑 Use template system instead of raw function
        send_email_with_template_helper(
            to_email=email,
            template_name="otp",
            variables={
                "name": user_data.get("name", "User"),
                "otp": otp
            }
        )

        return jsonify({'success': True, 'message': 'OTP sent successfully'}), 200

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp_route():
    data = request.get_json()
    email = data.get('email')
    otp_code = data.get('otp') or data.get('otp_code')

    result = verify_otp(email, otp_code)
    if not result['success']:
        return jsonify(result), 400

    return jsonify({'success': True, 'message': 'OTP verified successfully'})
@app.route('/api/admin/email-templates/<string:template_name>', methods=['PUT'])
def update_email_template(template_name):
    """Update subject/body of a template"""
    data = request.get_json()
    subject = data.get("subject")
    body = data.get("body")

    if not subject or not body:
        return jsonify({"error": "Both subject and body are required"}), 400

    conn = sqlite3.connect("hmx.db")
    c = conn.cursor()
    c.execute("UPDATE email_templates SET subject=?, body=? WHERE name=?", (subject, body, template_name))
    conn.commit()
    updated = c.rowcount
    conn.close()

    if updated:
        return jsonify({"message": "Template updated successfully"})
    else:
        return jsonify({"error": "Template not found"}), 404


@app.route('/api/admin/send-email', methods=['POST'])
def send_email_with_template():
    """Send email using a stored template + variables"""
    data = request.get_json()
    template_name = data.get("template")
    recipient = data.get("to")
    variables = data.get("variables", {})

    if not template_name or not recipient:
        return jsonify({"error": "Template name and recipient email are required"}), 400

    # Fetch template
    conn = sqlite3.connect("hmx.db")
    c = conn.cursor()
    c.execute("SELECT subject, body FROM email_templates WHERE name=?", (template_name,))
    row = c.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Template not found"}), 404

    subject, body = row

    # Replace placeholders {{var}}
    for key, value in variables.items():
        subject = subject.replace(f"{{{{{key}}}}}", value)
        body = body.replace(f"{{{{{key}}}}}", value)

    # Send email
    success = send_email_sync(recipient, subject, body, is_html=True)

    return jsonify({
        "success": success,
        "to": recipient,
        "subject": subject,
        "body": body
    })
# -------------------------------
# Admin Email Templates Management
# -------------------------------
@app.route('/api/admin/email-templates', methods=['GET'])
@token_required
def list_email_templates(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT name, subject, body FROM email_templates")
        templates = [
            {"name": row[0], "subject": row[1], "body": row[2]}
            for row in cursor.fetchall()
        ]
        conn.close()
        return jsonify(templates), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/email-templates/<string:name>', methods=['GET'])
@token_required
def get_email_template(current_user, name):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT name, subject, body FROM email_templates WHERE name = ?", (name,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({'error': f'Template {name} not found'}), 404

        return jsonify({"name": row[0], "subject": row[1], "body": row[2]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/email-templates/<string:name>', methods=['PUT'])
@token_required
def update_email_template_admin(current_user, name):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        data = request.get_json()
        subject = data.get("subject")
        body = data.get("body")

        if not subject or not body:
            return jsonify({'error': 'Both subject and body are required'}), 400

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE email_templates
            SET subject = ?, body = ?
            WHERE name = ?
        """, (subject, body, name))
        conn.commit()
        conn.close()

        return jsonify({'message': f'Template {name} updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/email-templates', methods=['POST'])
@token_required
def create_email_template(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        data = request.get_json()
        name = data.get("name")
        subject = data.get("subject")
        body = data.get("body")

        if not name or not subject or not body:
            return jsonify({'error': 'Name, subject, and body are required'}), 400

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO email_templates (name, subject, body)
            VALUES (?, ?, ?)
        """, (name, subject, body))
        conn.commit()
        conn.close()

        return jsonify({'message': f'Template {name} created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@app.route('/api/admin/referrals/recalculate-earnings', methods=['POST'])
@token_required
def recalculate_referral_earnings(current_user):
    """Recalculate and store referral earnings for all completed bookings with referral_id."""
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    conn = get_db()
    cursor = conn.cursor()
    # Find all completed bookings with referral_id and referral_earnings is null or zero
    cursor.execute('''
        SELECT id, referral_id, COALESCE(total_cost, base_package_cost, total_amount, 0) AS cost
        FROM bookings
        WHERE status = 'completed' AND referral_id IS NOT NULL AND (referral_earnings IS NULL OR referral_earnings = 0)
    ''')
    bookings = cursor.fetchall()
    updated_count = 0
    for booking in bookings:
        order_id, ref_id, cost = booking
        # Get commission rate from referrals table, default 12.5%
        cursor.execute('SELECT COALESCE(commission_rate, 12.5) FROM referrals WHERE id = ?', (ref_id,))
        rate_row = cursor.fetchone()
        rate = rate_row[0] if rate_row else 12.5
        rate_decimal = (rate / 100.0) if rate >= 1 else float(rate)
        ref_earn = round(float(cost) * rate_decimal, 2)
        # Update bookings and referrals
        cursor.execute('UPDATE bookings SET referral_earnings = ? WHERE id = ?', (ref_earn, order_id))
        cursor.execute('UPDATE referrals SET total_earnings = total_earnings + ? WHERE id = ?', (ref_earn, ref_id))
        updated_count += 1
    conn.commit()
    conn.close()
    return jsonify({'message': f'Recalculated referral earnings for {updated_count} bookings.'})

# Guest Booking Endpoint (with referral tracking)
@app.route('/api/guest/bookings', methods=['POST'])
def guest_booking():
    try:
        data = request.get_json()
        conn = get_db()
        c = conn.cursor()
        
        # Verify referral code/link if provided
        referral_id = None
        if data.get('referral_code'):
            c.execute("SELECT id FROM referrals WHERE referral_code = ? AND status = 'active'", (data['referral_code'],))
            referral = c.fetchone()
            if referral:
                referral_id = referral[0]
        elif data.get('referral_link'):
            # Extract code from link (e.g., https://hmx.in/ref/274b0632 -> 274b0632)
            code = data['referral_link'].split('/')[-1]
            c.execute("SELECT id FROM referrals WHERE referral_code = ? AND status = 'active'", (code,))
            referral = c.fetchone()
            if referral:
                referral_id = referral[0]
        
        # Check if this is an FPV event booking
        booking_category = data.get('booking_category', 'standard')
        
        if booking_category == 'fpv_event':
            # Insert into fpv_events table
            c.execute("""
                INSERT INTO fpv_events (
                    event_name, event_type, event_date, location_address, gps_link,
                    venue_type, shots_required, event_duration_hours, budget_range,
                    preferred_date, preferred_time,
                    event_start_date, event_end_date, expected_attendees,
                    organization_name, contact_person,
                    guest_name, guest_email, guest_phone, guest_address,
                    special_requirements, referral_id,
                    base_package_cost, total_cost, status, payment_status,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (
                data.get('event_name'),
                data.get('event_type'),
                data.get('event_date'),
                data.get('location_address'),
                data.get('gps_link'),
                data.get('venue_type'),
                data.get('shots_required'),
                data.get('event_duration_hours'),
                data.get('budget_range'),
                data.get('preferred_date'),
                data.get('preferred_time'),
                data.get('event_start_date'),
                data.get('event_end_date'),
                data.get('expected_attendees'),
                data.get('organization_name'),
                data.get('contact_person'),
                data.get('guest_name'),
                data.get('guest_email'),
                data.get('guest_phone'),
                data.get('guest_address'),
                data.get('special_requirements'),
                referral_id,
                data.get('base_package_cost', 0),
                data.get('total_cost', 0),
                'pending',
                'pending'
            ))
            
            booking_id = c.lastrowid
            
            # Update referral total_referrals count
            if referral_id:
                c.execute("UPDATE referrals SET total_referrals = total_referrals + 1 WHERE id = ?", (referral_id,))
            
            conn.commit()
            
            # Fetch created FPV event
            c.execute("SELECT * FROM fpv_events WHERE id = ?", (booking_id,))
            booking = dict(c.fetchone())
            
            conn.close()
            
            return jsonify(booking), 201
        
        else:
            # Create regular booking with guest info and referral tracking
            c.execute("""
                INSERT INTO bookings (
                    location_address, gps_link, property_type, indoor_outdoor,
                    area_size, area_unit, rooms_sections, num_floors,
                    preferred_date, preferred_time, special_requirements,
                    base_package_cost, total_cost, status, payment_status,
                    guest_name, guest_email, guest_phone, guest_address,
                    referral_id, booking_category,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (
                data.get('location_address'),
                data.get('gps_link'),
                data.get('property_type'),
                data.get('indoor_outdoor'),
                data.get('area_size'),
                data.get('area_unit', 'sq_ft'),
                data.get('rooms_sections'),
                data.get('num_floors', 1),
                data.get('preferred_date'),
                data.get('preferred_time'),
                data.get('special_requirements'),
                data.get('base_package_cost', 0),
                data.get('total_cost', 0),
                'pending',
                'pending',
                data.get('guest_name'),
                data.get('guest_email'),
                data.get('guest_phone'),
                data.get('guest_address'),
                referral_id,
                booking_category
            ))
            
            booking_id = c.lastrowid
            
            # Update referral total_referrals count
            if referral_id:
                c.execute("UPDATE referrals SET total_referrals = total_referrals + 1 WHERE id = ?", (referral_id,))
            
            conn.commit()
            
            # Fetch created booking
            c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,))
            booking = dict(c.fetchone())
            
            conn.close()
            
            return jsonify(booking), 201
        
    except Exception as e:
        print(f"Error creating guest booking: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/payouts/export', methods=['GET'])
@token_required
def export_payouts(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    import csv
    import io
    from flask import make_response
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all pending payouts (completed orders where roles haven't been paid)
    # This is a bit simplified. In a real app, you'd track 'payout_status'.
    cursor.execute("""
        SELECT 'pilot' as role, p.name, p.bank_name, p.account_number, p.ifsc_code, b.pilot_earnings as amount
        FROM bookings b JOIN pilots p ON b.pilot_id = p.id
        WHERE b.status = 'completed' AND b.pilot_earnings > 0
        UNION ALL
        SELECT 'editor' as role, e.name, e.bank_name, e.account_number, e.ifsc_code, b.editor_earnings as amount
        FROM bookings b JOIN editors e ON b.editor_id = e.id
        WHERE b.status = 'completed' AND b.editor_earnings > 0
        UNION ALL
        SELECT 'referral' as role, r.name, r.bank_name, r.account_number, r.ifsc_code, b.referral_earnings as amount
        FROM bookings b JOIN referrals r ON b.referral_id = r.id
        WHERE b.status = 'completed' AND b.referral_earnings > 0
    """)
    rows = cursor.fetchall()
    
    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['Role', 'Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Amount'])
    for row in rows:
        cw.writerow([row[0], row[1], row[2], row[3], row[4], row[5]])
    
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=payouts.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/api/auth/otp-login', methods=['POST'])
def otp_login():
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')
    
    verification = verify_otp(email, otp)
    if not verification['success']:
        return jsonify({'message': verification['error']}), 401
    
    user_data = json.loads(verification.get('user_data', '{}'))
    role = verification.get('user_type', 'client')
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Find user in respective table
    if role == 'pilot':
        cursor.execute("SELECT * FROM pilots WHERE email = ?", (email,))
    elif role == 'editor':
        cursor.execute("SELECT * FROM editors WHERE email = ?", (email,))
    elif role == 'referral':
        cursor.execute("SELECT * FROM referrals WHERE email = ?", (email,))
    else:
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    
    user = cursor.fetchone()
    if not user:
        return jsonify({'message': 'User not found after OTP verification'}), 404
    
    user_dict = dict(user)
    token_data = {
        'user_id': user_dict['id'],
        'role': role,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    token = jwt.encode(token_data, app.config['SECRET_KEY'])
    
    return jsonify({
        'token': token,
        'role': role,
        'user_id': user_dict['id'],
        'bbd_submitted': user_dict.get('bbd_form_submitted', 0) if role == 'client' else True
    })



if __name__ == '__main__':
    socketio.run(app, debug=True, port=5001, allow_unsafe_werkzeug=True)
