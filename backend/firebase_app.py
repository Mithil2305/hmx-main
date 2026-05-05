"""
HMX FPV Tours - Firebase Backend
=================================
Dummy working version with Firebase Firestore for data storage.
All API keys are read from environment variables.
"""

import os
from datetime import datetime, timedelta
from functools import wraps

# Load .env FIRST before any other imports
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import json

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Enable CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Initialize Firebase
firebase_config = {
    "type": os.getenv('FIREBASE_TYPE', 'service_account'),
    "project_id": os.getenv('FIREBASE_PROJECT_ID'),
    "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
    "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
    "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
    "client_id": os.getenv('FIREBASE_CLIENT_ID'),
    "auth_uri": os.getenv('FIREBASE_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
    "token_uri": os.getenv('FIREBASE_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
    "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_CERT_URL', 'https://www.googleapis.com/oauth2/v1/certs'),
    "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_CERT_URL'),
}

# Check if Firebase credentials are available
if firebase_config["project_id"] and firebase_config["private_key"]:
    cred = credentials.Certificate(firebase_config)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase initialized successfully")
else:
    print("⚠️ Firebase credentials not found. Running in mock mode.")
    db = None

# ==================== MOCK DATABASE (Fallback) ====================
class MockDB:
    """In-memory mock database for when Firebase is not configured"""
    def __init__(self):
        self.users = {}
        self.pilots = {}
        self.editors = {}
        self.referrals = {}
        self.bookings = {}
        self.messages = {}
        self.business_bookings = {}
        self.counters = {'users': 0, 'pilots': 0, 'editors': 0, 'referrals': 0, 'bookings': 0, 'messages': 0, 'business_bookings': 0}
        self._init_sample_data()
    
    def _init_sample_data(self):
        # Create admin user
        self.users['admin@hmx.com'] = {
            'id': 1,
            'email': 'admin@hmx.com',
            'password': generate_password_hash('admin123'),
            'full_name': 'Admin User',
            'role': 'admin',
            'is_approved': True,
            'created_at': datetime.now().isoformat()
        }
        self.counters['users'] = 1
        
        # Create sample pilot
        self.pilots['pilot@hmx.com'] = {
            'id': 1,
            'email': 'pilot@hmx.com',
            'password': generate_password_hash('pilot123'),
            'full_name': 'Test Pilot',
            'phone': '+91-9876543210',
            'cities': ['Mumbai', 'Delhi'],
            'experience': '5 years',
            'is_approved': True,
            'created_at': datetime.now().isoformat()
        }
        self.counters['pilots'] = 1
        
        # Create sample editor
        self.editors['editor@hmx.com'] = {
            'id': 1,
            'email': 'editor@hmx.com',
            'password': generate_password_hash('editor123'),
            'full_name': 'Test Editor',
            'is_approved': True,
            'created_at': datetime.now().isoformat()
        }
        self.counters['editors'] = 1
        
        # Create sample referral
        self.referrals['referral@hmx.com'] = {
            'id': 1,
            'email': 'referral@hmx.com',
            'password': generate_password_hash('referral123'),
            'full_name': 'Test Referral',
            'referral_code': 'REF001',
            'is_approved': True,
            'created_at': datetime.now().isoformat()
        }
        self.counters['referrals'] = 1

mock_db = MockDB()

# ==================== DATABASE HELPERS ====================

def get_collection(name):
    """Get a Firestore collection or mock collection"""
    if db:
        return db.collection(name)
    return None

def add_document(collection_name, data, doc_id=None):
    """Add a document to Firestore or mock DB"""
    if db:
        if doc_id:
            db.collection(collection_name).document(doc_id).set(data)
            return doc_id
        else:
            doc_ref = db.collection(collection_name).add(data)
            return doc_ref[1].id
    else:
        # Mock mode
        if collection_name == 'users':
            mock_db.counters['users'] += 1
            data['id'] = mock_db.counters['users']
            mock_db.users[data.get('email', str(uuid.uuid4()))] = data
            return str(data['id'])
        elif collection_name == 'pilots':
            mock_db.counters['pilots'] += 1
            data['id'] = mock_db.counters['pilots']
            mock_db.pilots[data.get('email', str(uuid.uuid4()))] = data
            return str(data['id'])
        elif collection_name == 'editors':
            mock_db.counters['editors'] += 1
            data['id'] = mock_db.counters['editors']
            mock_db.editors[data.get('email', str(uuid.uuid4()))] = data
            return str(data['id'])
        elif collection_name == 'referrals':
            mock_db.counters['referrals'] += 1
            data['id'] = mock_db.counters['referrals']
            mock_db.referrals[data.get('email', str(uuid.uuid4()))] = data
            return str(data['id'])
        elif collection_name == 'bookings':
            mock_db.counters['bookings'] += 1
            data['id'] = mock_db.counters['bookings']
            mock_db.bookings[str(data['id'])] = data
            return str(data['id'])
        elif collection_name == 'business_bookings':
            mock_db.counters['business_bookings'] += 1
            data['id'] = mock_db.counters['business_bookings']
            mock_db.business_bookings[str(data['id'])] = data
            return str(data['id'])
        elif collection_name == 'messages':
            mock_db.counters['messages'] += 1
            data['id'] = mock_db.counters['messages']
            mock_db.messages[str(data['id'])] = data
            return str(data['id'])
        return str(uuid.uuid4())

def get_document(collection_name, doc_id):
    """Get a document from Firestore or mock DB"""
    if db:
        doc = db.collection(collection_name).document(doc_id).get()
        return doc.to_dict() if doc.exists else None
    else:
        if collection_name == 'users':
            return mock_db.users.get(doc_id)
        elif collection_name == 'pilots':
            return mock_db.pilots.get(doc_id)
        elif collection_name == 'editors':
            return mock_db.editors.get(doc_id)
        elif collection_name == 'referrals':
            return mock_db.referrals.get(doc_id)
        elif collection_name == 'bookings':
            return mock_db.bookings.get(doc_id)
        elif collection_name == 'business_bookings':
            return mock_db.business_bookings.get(doc_id)
        elif collection_name == 'messages':
            return mock_db.messages.get(doc_id)
        return None

def query_documents(collection_name, field, operator, value):
    """Query documents from Firestore or mock DB"""
    if db:
        docs = db.collection(collection_name).where(field, operator, value).stream()
        return [(doc.id, doc.to_dict()) for doc in docs]
    else:
        result = []
        data_dict = None
        if collection_name == 'users':
            data_dict = mock_db.users
        elif collection_name == 'pilots':
            data_dict = mock_db.pilots
        elif collection_name == 'editors':
            data_dict = mock_db.editors
        elif collection_name == 'referrals':
            data_dict = mock_db.referrals
        elif collection_name == 'bookings':
            data_dict = mock_db.bookings
        elif collection_name == 'business_bookings':
            data_dict = mock_db.business_bookings
        elif collection_name == 'messages':
            data_dict = mock_db.messages
        
        if data_dict:
            for doc_id, data in data_dict.items():
                if field in data:
                    if operator == '==' and data[field] == value:
                        result.append((doc_id, data))
                    elif operator == 'in' and value in data[field] if isinstance(data[field], list) else data[field] == value:
                        result.append((doc_id, data))
        return result

def get_all_documents(collection_name):
    """Get all documents from a collection"""
    if db:
        docs = db.collection(collection_name).stream()
        return [(doc.id, doc.to_dict()) for doc in docs]
    else:
        if collection_name == 'users':
            return list(mock_db.users.items())
        elif collection_name == 'pilots':
            return list(mock_db.pilots.items())
        elif collection_name == 'editors':
            return list(mock_db.editors.items())
        elif collection_name == 'referrals':
            return list(mock_db.referrals.items())
        elif collection_name == 'bookings':
            return list(mock_db.bookings.items())
        elif collection_name == 'business_bookings':
            return list(mock_db.business_bookings.items())
        elif collection_name == 'messages':
            return list(mock_db.messages.items())
        return []

def update_document(collection_name, doc_id, data):
    """Update a document in Firestore or mock DB"""
    if db:
        db.collection(collection_name).document(doc_id).update(data)
    else:
        if collection_name == 'users' and doc_id in mock_db.users:
            mock_db.users[doc_id].update(data)
        elif collection_name == 'pilots' and doc_id in mock_db.pilots:
            mock_db.pilots[doc_id].update(data)
        elif collection_name == 'editors' and doc_id in mock_db.editors:
            mock_db.editors[doc_id].update(data)
        elif collection_name == 'referrals' and doc_id in mock_db.referrals:
            mock_db.referrals[doc_id].update(data)
        elif collection_name == 'bookings' and doc_id in mock_db.bookings:
            mock_db.bookings[doc_id].update(data)
        elif collection_name == 'business_bookings' and doc_id in mock_db.business_bookings:
            mock_db.business_bookings[doc_id].update(data)
        elif collection_name == 'messages' and doc_id in mock_db.messages:
            mock_db.messages[doc_id].update(data)

def delete_document(collection_name, doc_id):
    """Delete a document from Firestore or mock DB"""
    if db:
        db.collection(collection_name).document(doc_id).delete()
    else:
        if collection_name == 'users' and doc_id in mock_db.users:
            del mock_db.users[doc_id]
        elif collection_name == 'pilots' and doc_id in mock_db.pilots:
            del mock_db.pilots[doc_id]
        elif collection_name == 'editors' and doc_id in mock_db.editors:
            del mock_db.editors[doc_id]
        elif collection_name == 'referrals' and doc_id in mock_db.referrals:
            del mock_db.referrals[doc_id]
        elif collection_name == 'bookings' and doc_id in mock_db.bookings:
            del mock_db.bookings[doc_id]
        elif collection_name == 'business_bookings' and doc_id in mock_db.business_bookings:
            del mock_db.business_bookings[doc_id]
        elif collection_name == 'messages' and doc_id in mock_db.messages:
            del mock_db.messages[doc_id]

# ==================== AUTHENTICATION ====================

def token_required(f):
    """Decorator to protect routes with JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = {
                'user_id': data['user_id'],
                'role': data['role'],
                'email': data.get('email', '')
            }
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def generate_token(user_id, role, email):
    """Generate JWT token"""
    payload = {
        'user_id': user_id,
        'role': role,
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

# ==================== CITY LIST ====================
CITY_LIST = [
    'Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
    'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh', 'Lucknow'
]

# ==================== ROUTES ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'firebase_connected': db is not None,
        'timestamp': datetime.now().isoformat()
    })

# ==================== AUTH ROUTES ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new client/business user"""
    try:
        data = request.get_json()
        
        # Required fields
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        business_name = data.get('businessName', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Check if user already exists
        existing = query_documents('users', 'email', '==', email)
        if existing:
            return jsonify({'error': 'Email already registered'}), 409
        
        # Create user
        user_data = {
            'email': email,
            'password': generate_password_hash(password),
            'business_name': business_name or data.get('business_name', ''),
            'registration_number': data.get('registrationNumber', ''),
            'organization_type': data.get('organizationType', ''),
            'incorporation_date': data.get('incorporationDate', ''),
            'official_address': data.get('officialAddress', ''),
            'official_email': data.get('officialEmail', ''),
            'phone': data.get('phone', ''),
            'contact_name': data.get('contactName', ''),
            'contact_designation': data.get('contactDesignation', ''),
            'registration_certificate_url': data.get('registrationCertificateUrl', ''),
            'tax_identification_url': data.get('taxIdentificationUrl', ''),
            'business_license_url': data.get('businessLicenseUrl', ''),
            'address_proof_url': data.get('addressProofUrl', ''),
            'role': 'client',
            'is_approved': True,  # Auto-approve for demo
            'has_completed_bbd': False,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        doc_id = add_document('users', user_data, email)
        user_data['id'] = doc_id
        
        # Generate token
        token = generate_token(doc_id, 'client', email)
        
        return jsonify({
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': doc_id,
                'email': email,
                'role': 'client',
                'business_name': user_data['business_name']
            }
        }), 201
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        role = data.get('role', 'client')  # client, pilot, editor, referral, admin
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = None
        collection_name = 'users'
        
        # Check different collections based on role
        if role == 'admin' or role == 'client':
            users = query_documents('users', 'email', '==', email)
            if users:
                doc_id, user = users[0]
                collection_name = 'users'
        
        if not user and (role == 'pilot' or role == 'any'):
            pilots = query_documents('pilots', 'email', '==', email)
            if pilots:
                doc_id, user = pilots[0]
                collection_name = 'pilots'
                role = 'pilot'
        
        if not user and (role == 'editor' or role == 'any'):
            editors = query_documents('editors', 'email', '==', email)
            if editors:
                doc_id, user = editors[0]
                collection_name = 'editors'
                role = 'editor'
        
        if not user and (role == 'referral' or role == 'any'):
            referrals = query_documents('referrals', 'email', '==', email)
            if referrals:
                doc_id, user = referrals[0]
                collection_name = 'referrals'
                role = 'referral'
        
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check password
        stored_password = user.get('password', '')
        if not check_password_hash(stored_password, password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Generate token
        user_id = str(user.get('id', doc_id))
        token = generate_token(user_id, role, email)
        
        # Remove password from response
        user_response = {k: v for k, v in user.items() if k != 'password'}
        user_response['role'] = role
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': user_response
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@app.route('/api/auth/verify', methods=['GET'])
@token_required
def verify_token_endpoint(current_user):
    """Verify token and return user data"""
    try:
        role = current_user['role']
        user_id = current_user['user_id']
        email = current_user['email']
        
        user = None
        if role == 'client' or role == 'admin':
            user = get_document('users', email)
        elif role == 'pilot':
            pilots = query_documents('pilots', 'email', '==', email)
            if pilots:
                _, user = pilots[0]
        elif role == 'editor':
            editors = query_documents('editors', 'email', '==', email)
            if editors:
                _, user = editors[0]
        elif role == 'referral':
            referrals = query_documents('referrals', 'email', '==', email)
            if referrals:
                _, user = referrals[0]
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_response = {k: v for k, v in user.items() if k != 'password'}
        user_response['role'] = role
        user_response['user_id'] = user_id
        
        return jsonify(user_response), 200
        
    except Exception as e:
        print(f"Verify error: {str(e)}")
        return jsonify({'error': 'Verification failed'}), 500

# ==================== PILOT ROUTES ====================

@app.route('/api/pilots/register', methods=['POST'])
def register_pilot():
    """Register a new pilot"""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Check if pilot exists
        existing = query_documents('pilots', 'email', '==', email)
        if existing:
            return jsonify({'error': 'Email already registered'}), 409
        
        pilot_data = {
            'email': email,
            'password': generate_password_hash(password),
            'full_name': data.get('fullName', ''),
            'date_of_birth': data.get('dateOfBirth', ''),
            'gender': data.get('gender', ''),
            'address': data.get('address', ''),
            'phone': data.get('phone', ''),
            'government_id_proof': data.get('governmentIdProof', ''),
            'license_number': data.get('licenseNumber', ''),
            'issuing_authority': data.get('issuingAuthority', ''),
            'license_issue_date': data.get('licenseIssueDate', ''),
            'license_expiry_date': data.get('licenseExpiryDate', ''),
            'drone_model': data.get('droneModel', ''),
            'drone_serial': data.get('droneSerial', ''),
            'drone_uin': data.get('droneUin', ''),
            'drone_category': data.get('droneCategory', ''),
            'total_flying_hours': data.get('totalFlyingHours', ''),
            'flight_records': data.get('flightRecords', ''),
            'insurance_policy': data.get('insurancePolicy', ''),
            'insurance_validity': data.get('insuranceValidity', ''),
            'cities': data.get('cities', []),
            'experience': data.get('experience', ''),
            'equipment': data.get('equipment', ''),
            'portfolio': data.get('portfolio', ''),
            'bank_account': data.get('bankAccount', ''),
            'pilot_license_url': data.get('pilotLicenseUrl', ''),
            'id_proof_url': data.get('idProofUrl', ''),
            'training_certificate_url': data.get('trainingCertificateUrl', ''),
            'photograph_url': data.get('photographUrl', ''),
            'insurance_certificate_url': data.get('insuranceCertificateUrl', ''),
            'is_approved': True,  # Auto-approve for demo
            'is_available': True,
            'current_bookings': 0,
            'rating': 0,
            'total_reviews': 0,
            'earnings': 0,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        doc_id = add_document('pilots', pilot_data, email)
        pilot_data['id'] = doc_id
        
        token = generate_token(doc_id, 'pilot', email)
        
        return jsonify({
            'message': 'Pilot registration successful',
            'token': token,
            'user': {
                'id': doc_id,
                'email': email,
                'role': 'pilot',
                'full_name': pilot_data['full_name']
            }
        }), 201
        
    except Exception as e:
        print(f"Pilot registration error: {str(e)}")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/api/pilots', methods=['GET'])
@token_required
def get_pilots(current_user):
    """Get all pilots (admin only)"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    pilots = get_all_documents('pilots')
    result = []
    for doc_id, pilot in pilots:
        pilot_data = {k: v for k, v in pilot.items() if k != 'password'}
        pilot_data['id'] = doc_id
        result.append(pilot_data)
    
    return jsonify(result), 200

# ==================== EDITOR ROUTES ====================

@app.route('/api/editors/register', methods=['POST'])
def register_editor():
    """Register a new editor"""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        existing = query_documents('editors', 'email', '==', email)
        if existing:
            return jsonify({'error': 'Email already registered'}), 409
        
        editor_data = {
            'email': email,
            'password': generate_password_hash(password),
            'full_name': data.get('fullName', ''),
            'phone': data.get('phone', ''),
            'skills': data.get('skills', []),
            'software': data.get('software', []),
            'experience_years': data.get('experienceYears', ''),
            'portfolio_url': data.get('portfolioUrl', ''),
            'hourly_rate': data.get('hourlyRate', 0),
            'is_approved': True,
            'is_available': True,
            'current_projects': 0,
            'completed_projects': 0,
            'rating': 0,
            'earnings': 0,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        doc_id = add_document('editors', editor_data, email)
        editor_data['id'] = doc_id
        
        token = generate_token(doc_id, 'editor', email)
        
        return jsonify({
            'message': 'Editor registration successful',
            'token': token,
            'user': {
                'id': doc_id,
                'email': email,
                'role': 'editor',
                'full_name': editor_data['full_name']
            }
        }), 201
        
    except Exception as e:
        print(f"Editor registration error: {str(e)}")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/api/editors', methods=['GET'])
@token_required
def get_editors(current_user):
    """Get all editors (admin only)"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    editors = get_all_documents('editors')
    result = []
    for doc_id, editor in editors:
        editor_data = {k: v for k, v in editor.items() if k != 'password'}
        editor_data['id'] = doc_id
        result.append(editor_data)
    
    return jsonify(result), 200

# ==================== REFERRAL ROUTES ====================

@app.route('/api/referrals/register', methods=['POST'])
def register_referral():
    """Register a new referral partner"""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        existing = query_documents('referrals', 'email', '==', email)
        if existing:
            return jsonify({'error': 'Email already registered'}), 409
        
        referral_code = f"REF{uuid.uuid4().hex[:6].upper()}"
        
        referral_data = {
            'email': email,
            'password': generate_password_hash(password),
            'full_name': data.get('fullName', ''),
            'phone': data.get('phone', ''),
            'address': data.get('address', ''),
            'referral_code': referral_code,
            'referral_type': data.get('referralType', 'individual'),
            'id_proof_url': data.get('idProofUrl', ''),
            'is_approved': True,
            'total_referrals': 0,
            'successful_referrals': 0,
            'pending_referrals': 0,
            'total_earnings': 0,
            'paid_earnings': 0,
            'pending_earnings': 0,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        doc_id = add_document('referrals', referral_data, email)
        referral_data['id'] = doc_id
        
        token = generate_token(doc_id, 'referral', email)
        
        return jsonify({
            'message': 'Referral registration successful',
            'token': token,
            'user': {
                'id': doc_id,
                'email': email,
                'role': 'referral',
                'full_name': referral_data['full_name'],
                'referral_code': referral_code
            }
        }), 201
        
    except Exception as e:
        print(f"Referral registration error: {str(e)}")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/api/referrals', methods=['GET'])
@token_required
def get_referrals(current_user):
    """Get all referrals (admin only)"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    referrals = get_all_documents('referrals')
    result = []
    for doc_id, referral in referrals:
        ref_data = {k: v for k, v in referral.items() if k != 'password'}
        ref_data['id'] = doc_id
        result.append(ref_data)
    
    return jsonify(result), 200

# ==================== BOOKING ROUTES ====================

@app.route('/api/bookings', methods=['GET', 'POST'])
@token_required
def handle_bookings(current_user):
    """Get or create bookings"""
    if request.method == 'GET':
        # Get bookings based on role
        bookings = get_all_documents('bookings')
        result = []
        
        for doc_id, booking in bookings:
            # Filter by role
            if current_user['role'] == 'client':
                if booking.get('client_id') != current_user['user_id']:
                    continue
            elif current_user['role'] == 'pilot':
                if booking.get('pilot_id') != current_user['user_id']:
                    continue
            elif current_user['role'] == 'editor':
                if booking.get('editor_id') != current_user['user_id']:
                    continue
            
            booking['id'] = doc_id
            result.append(booking)
        
        return jsonify(result), 200
    
    elif request.method == 'POST':
        # Create new booking
        data = request.get_json()
        
        booking_data = {
            'client_id': current_user['user_id'],
            'client_email': current_user['email'],
            'business_name': data.get('businessName', ''),
            'business_size': data.get('businessSize', ''),
            'category': data.get('category', ''),
            'address': data.get('address', ''),
            'city': data.get('city', ''),
            'state': data.get('state', ''),
            'preferred_dates': data.get('preferredDates', []),
            'time_slot': data.get('timeSlot', ''),
            'platform_preference': data.get('platformPreference', ''),
            'special_requirements': data.get('specialRequirements', ''),
            'status': 'pending',
            'pilot_id': None,
            'editor_id': None,
            'cost': data.get('cost', 0),
            'payment_status': 'pending',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        doc_id = add_document('bookings', booking_data)
        booking_data['id'] = doc_id
        
        return jsonify({
            'message': 'Booking created successfully',
            'booking': booking_data
        }), 201

@app.route('/api/bookings/<booking_id>/accept', methods=['POST'])
@token_required
def accept_booking(current_user, booking_id):
    """Pilot accepts a booking"""
    if current_user['role'] != 'pilot':
        return jsonify({'error': 'Only pilots can accept bookings'}), 403
    
    booking = get_document('bookings', booking_id)
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    
    if booking.get('status') != 'pending':
        return jsonify({'error': 'Booking is no longer available'}), 400
    
    update_document('bookings', booking_id, {
        'pilot_id': current_user['user_id'],
        'status': 'assigned',
        'updated_at': datetime.now().isoformat()
    })
    
    return jsonify({'message': 'Booking accepted successfully'}), 200

@app.route('/api/bookings/<booking_id>/start', methods=['POST'])
@token_required
def start_booking(current_user, booking_id):
    """Pilot starts a booking"""
    if current_user['role'] != 'pilot':
        return jsonify({'error': 'Only pilots can start bookings'}), 403
    
    booking = get_document('bookings', booking_id)
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    
    update_document('bookings', booking_id, {
        'status': 'in_progress',
        'started_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    })
    
    return jsonify({'message': 'Booking started successfully'}), 200

@app.route('/api/bookings/<booking_id>/complete', methods=['POST'])
@token_required
def complete_booking(current_user, booking_id):
    """Pilot completes a booking"""
    if current_user['role'] != 'pilot':
        return jsonify({'error': 'Only pilots can complete bookings'}), 403
    
    booking = get_document('bookings', booking_id)
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    
    data = request.get_json()
    
    update_document('bookings', booking_id, {
        'status': 'footage_uploaded',
        'raw_video_url': data.get('rawVideoUrl', ''),
        'completed_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    })
    
    return jsonify({'message': 'Booking marked as complete'}), 200

@app.route('/api/bookings/<booking_id>/assign-editor', methods=['POST'])
@token_required
def assign_editor(current_user, booking_id):
    """Admin assigns editor to booking"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Only admin can assign editors'}), 403
    
    data = request.get_json()
    editor_id = data.get('editor_id')
    
    if not editor_id:
        return jsonify({'error': 'Editor ID is required'}), 400
    
    update_document('bookings', booking_id, {
        'editor_id': editor_id,
        'status': 'editing',
        'updated_at': datetime.now().isoformat()
    })
    
    return jsonify({'message': 'Editor assigned successfully'}), 200

@app.route('/api/bookings/<booking_id>/submit-edit', methods=['POST'])
@token_required
def submit_edit(current_user, booking_id):
    """Editor submits edited footage"""
    if current_user['role'] != 'editor':
        return jsonify({'error': 'Only editors can submit edits'}), 403
    
    data = request.get_json()
    
    update_document('bookings', booking_id, {
        'status': 'review',
        'edited_video_url': data.get('url', ''),
        'updated_at': datetime.now().isoformat()
    })
    
    return jsonify({'message': 'Edit submitted for review'}), 200

@app.route('/api/bookings/<booking_id>/approve', methods=['POST'])
@token_required
def approve_booking(current_user, booking_id):
    """Client approves the final edit"""
    if current_user['role'] != 'client':
        return jsonify({'error': 'Only clients can approve bookings'}), 403
    
    update_document('bookings', booking_id, {
        'status': 'completed',
        'approved_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    })
    
    return jsonify({'message': 'Booking approved successfully'}), 200

# ==================== BUSINESS BOOKING ROUTES ====================

@app.route('/api/business/booking', methods=['POST'])
@token_required
def create_business_booking(current_user):
    """Create a business booking"""
    if current_user['role'] not in ['client', 'admin']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    # Calculate cost based on business size
    size_costs = {
        'small': 5000,
        'medium': 10000,
        'large': 20000,
        'extra-large': 40000,
        'enterprise': 0  # Custom quote
    }
    
    business_size = data.get('businessSize', 'small')
    cost = size_costs.get(business_size, 5000)
    
    booking_data = {
        'user_id': current_user['user_id'],
        'business_name': data.get('businessName', ''),
        'owner_name': data.get('ownerName', ''),
        'phone': data.get('phone', ''),
        'email': data.get('email', ''),
        'category': data.get('category', ''),
        'business_size': business_size,
        'num_floors': data.get('numFloors', 'G'),
        'address': data.get('address', ''),
        'city': data.get('city', ''),
        'state': data.get('state', ''),
        'preferred_dates': data.get('preferredDates', []),
        'platform_preference': data.get('platformPreference', ''),
        'time_slot': data.get('timeSlot', ''),
        'special_requirements': data.get('specialRequirements', ''),
        'cost': cost,
        'status': 'pending_approval',
        'payment_status': 'pending',
        'otp_verified': True,  # Auto-verify for demo
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    doc_id = add_document('business_bookings', booking_data)
    booking_data['id'] = doc_id
    
    # Mark BBD as completed for user
    update_document('users', current_user['email'], {
        'has_completed_bbd': True,
        'updated_at': datetime.now().isoformat()
    })
    
    return jsonify({
        'message': 'Business booking created successfully',
        'booking': booking_data
    }), 201

@app.route('/api/business/booking-status', methods=['GET'])
@token_required
def check_bbd_status(current_user):
    """Check if user has completed BBD"""
    if current_user['role'] not in ['client', 'admin']:
        return jsonify({'hasCompletedBBD': False}), 200
    
    user = get_document('users', current_user['email'])
    has_completed = user.get('has_completed_bbd', False) if user else False
    
    return jsonify({'hasCompletedBBD': has_completed}), 200

@app.route('/api/admin/business-bookings', methods=['GET'])
@token_required
def get_business_bookings(current_user):
    """Get all business bookings (admin only)"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    bookings = get_all_documents('business_bookings')
    result = []
    for doc_id, booking in bookings:
        booking['id'] = doc_id
        result.append(booking)
    
    return jsonify(result), 200

@app.route('/api/admin/orders/<booking_id>', methods=['PUT'])
@token_required
def update_order(current_user, booking_id):
    """Update order status (admin only)"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    update_data = {
        'status': data.get('status'),
        'updated_at': datetime.now().isoformat()
    }
    
    if 'admin_comments' in data:
        update_data['admin_comments'] = data['admin_comments']
    if 'pilot_id' in data:
        update_data['pilot_id'] = data['pilot_id']
    if 'editor_id' in data:
        update_data['editor_id'] = data['editor_id']
    if 'total_cost' in data:
        update_data['cost'] = data['total_cost']
    
    update_document('business_bookings', booking_id, update_data)
    
    return jsonify({'message': 'Order updated successfully'}), 200

# ==================== PAYMENT ROUTES ====================

@app.route('/api/payment/initiate', methods=['POST'])
@token_required
def initiate_payment(current_user):
    """Initiate payment for booking"""
    data = request.get_json()
    booking_id = data.get('booking_id')
    amount = data.get('amount', 0)
    
    # Generate mock transaction ID
    transaction_id = f"TXN{uuid.uuid4().hex[:12].upper()}"
    
    return jsonify({
        'success': True,
        'transaction_id': transaction_id,
        'amount': amount,
        'redirect_url': f'/payment/callback?transactionId={transaction_id}&status=SUCCESS',
        'message': 'Payment initiated (mock mode)'
    }), 200

@app.route('/api/payment/status/<transaction_id>', methods=['GET'])
@token_required
def check_payment_status(current_user, transaction_id):
    """Check payment status"""
    return jsonify({
        'transaction_id': transaction_id,
        'status': 'SUCCESS',
        'amount': 0,
        'message': 'Payment successful (mock mode)'
    }), 200

@app.route('/api/payment/refund', methods=['POST'])
@token_required
def process_refund(current_user):
    """Process refund"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    return jsonify({
        'success': True,
        'refund_id': f"REF{uuid.uuid4().hex[:8].upper()}",
        'message': 'Refund processed (mock mode)'
    }), 200

# ==================== MESSAGE ROUTES ====================

@app.route('/api/messages', methods=['GET', 'POST'])
@token_required
def handle_messages(current_user):
    """Get or send messages"""
    if request.method == 'GET':
        messages = get_all_documents('messages')
        result = []
        
        for doc_id, msg in messages:
            if (msg.get('sender_id') == current_user['user_id'] or 
                msg.get('receiver_id') == current_user['user_id']):
                msg['id'] = doc_id
                result.append(msg)
        
        return jsonify({
            'messages': result,
            'current_user': {
                'id': current_user['user_id'],
                'role': current_user['role']
            }
        }), 200
    
    elif request.method == 'POST':
        data = request.get_json()
        
        message_data = {
            'sender_id': current_user['user_id'],
            'sender_role': current_user['role'],
            'receiver_id': data.get('receiver_id'),
            'receiver_role': data.get('receiver_role'),
            'content': data.get('content', ''),
            'status': 'sent',
            'created_at': datetime.now().isoformat()
        }
        
        doc_id = add_document('messages', message_data)
        message_data['id'] = doc_id
        
        return jsonify({
            'message': 'Message sent',
            'data': message_data
        }), 201

# ==================== ADMIN ROUTES ====================

@app.route('/api/admin/users', methods=['GET'])
@token_required
def admin_get_users(current_user):
    """Get all users (admin only)"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = get_all_documents('users')
    result = []
    for doc_id, user in users:
        user_data = {k: v for k, v in user.items() if k != 'password'}
        user_data['id'] = doc_id
        result.append(user_data)
    
    return jsonify(result), 200

@app.route('/api/admin/dashboard', methods=['GET'])
@token_required
def admin_dashboard(current_user):
    """Get admin dashboard stats"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = get_all_documents('users')
    pilots = get_all_documents('pilots')
    editors = get_all_documents('editors')
    referrals = get_all_documents('referrals')
    bookings = get_all_documents('bookings')
    business_bookings = get_all_documents('business_bookings')
    
    return jsonify({
        'stats': {
            'total_users': len(users),
            'total_pilots': len(pilots),
            'total_editors': len(editors),
            'total_referrals': len(referrals),
            'total_bookings': len(bookings),
            'total_business_bookings': len(business_bookings),
            'pending_approvals': sum(1 for _, u in pilots if not u.get('is_approved', False)),
            'pending_bookings': sum(1 for _, b in business_bookings if b.get('status') == 'pending_approval')
        }
    }), 200

@app.route('/api/admin/users/<user_id>/approval', methods=['PUT'])
@token_required
def update_user_approval(current_user, user_id):
    """Approve or reject user (admin only)"""
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    is_approved = data.get('is_approved', False)
    role = data.get('role', 'pilot')
    
    collection = 'pilots' if role == 'pilot' else 'editors' if role == 'editor' else 'referrals' if role == 'referral' else 'users'
    
    update_document(collection, user_id, {
        'is_approved': is_approved,
        'updated_at': datetime.now().isoformat()
    })
    
    return jsonify({'message': f'User approval status updated to {is_approved}'}), 200

# ==================== CLIENT PROFILE ROUTES ====================

@app.route('/api/clients/profile', methods=['PUT'])
@token_required
def update_client_profile(current_user):
    """Update client profile"""
    if current_user['role'] != 'client':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    update_data = {
        'updated_at': datetime.now().isoformat()
    }
    
    # Update allowed fields
    allowed_fields = ['business_name', 'phone', 'official_address', 'contact_name']
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
    
    update_document('users', current_user['email'], update_data)
    
    return jsonify({'message': 'Profile updated successfully'}), 200

@app.route('/api/clients/password', methods=['PUT'])
@token_required
def update_client_password(current_user):
    """Update client password"""
    if current_user['role'] != 'client':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    current_password = data.get('currentPassword', '')
    new_password = data.get('newPassword', '')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current and new password required'}), 400
    
    user = get_document('users', current_user['email'])
    if not user or not check_password_hash(user.get('password', ''), current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400
    
    update_document('users', current_user['email'], {
        'password': generate_password_hash(new_password),
        'updated_at': datetime.now().isoformat()
    })
    
    return jsonify({'message': 'Password updated successfully'}), 200

@app.route('/api/clients/bookings', methods=['GET'])
@token_required
def get_client_bookings(current_user):
    """Get client's bookings"""
    if current_user['role'] not in ['client', 'admin']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    bookings = get_all_documents('business_bookings')
    result = []
    
    for doc_id, booking in bookings:
        if current_user['role'] == 'admin' or booking.get('user_id') == current_user['user_id']:
            booking['id'] = doc_id
            result.append(booking)
    
    return jsonify(result), 200

# ==================== OTP ROUTES (Mock) ====================

@app.route('/api/auth/request-otp', methods=['POST'])
def request_otp():
    """Request OTP (mock - always returns success)"""
    data = request.get_json()
    email = data.get('email', '')
    
    # In production, this would send an email
    # For demo, we accept any OTP
    
    return jsonify({
        'message': 'OTP sent successfully (demo mode - use any 6-digit OTP)',
        'demo_otp': '123456'  # For testing
    }), 200

@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP (mock - accepts any 6-digit code)"""
    data = request.get_json()
    otp = data.get('otp', '')
    
    # Accept any 6-digit OTP for demo
    if len(otp) == 6 and otp.isdigit():
        return jsonify({'success': True, 'message': 'OTP verified'}), 200
    
    return jsonify({'success': False, 'error': 'Invalid OTP'}), 400

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset password"""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        new_password = data.get('new_password', '')
        
        if not email or not new_password:
            return jsonify({'error': 'Email and new password are required'}), 400
        
        # Check all collections for the user
        user_found = False
        
        users = query_documents('users', 'email', '==', email)
        if users:
            doc_id, _ = users[0]
            update_document('users', doc_id, {'password': generate_password_hash(new_password)})
            user_found = True
        
        if not user_found:
            pilots = query_documents('pilots', 'email', '==', email)
            if pilots:
                doc_id, _ = pilots[0]
                update_document('pilots', doc_id, {'password': generate_password_hash(new_password)})
                user_found = True
        
        if not user_found:
            editors = query_documents('editors', 'email', '==', email)
            if editors:
                doc_id, _ = editors[0]
                update_document('editors', doc_id, {'password': generate_password_hash(new_password)})
                user_found = True
        
        if not user_found:
            referrals = query_documents('referrals', 'email', '==', email)
            if referrals:
                doc_id, _ = referrals[0]
                update_document('referrals', doc_id, {'password': generate_password_hash(new_password)})
                user_found = True
        
        if not user_found:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        print(f"Reset password error: {str(e)}")
        return jsonify({'error': 'Failed to reset password'}), 500

# ==================== CITIES ROUTE ====================

@app.route('/api/cities', methods=['GET'])
def get_cities():
    """Get list of cities"""
    return jsonify(CITY_LIST), 200

# ==================== MAIN ====================

if __name__ == '__main__':
    print("=" * 60)
    print("HMX FPV Tours - Firebase Backend")
    print("=" * 60)
    print(f"Firebase Connected: {db is not None}")
    print(f"Running on http://localhost:5001")
    print("=" * 60)
    
    # Print demo credentials
    print("\n🎯 DEMO CREDENTIALS:")
    print("   Admin:    admin@hmx.com / admin123")
    print("   Pilot:    pilot@hmx.com / pilot123")
    print("   Editor:   editor@hmx.com / editor123")
    print("   Referral: referral@hmx.com / referral123")
    print("")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
