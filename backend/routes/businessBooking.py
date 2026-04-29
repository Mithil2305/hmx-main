from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import os
import uuid
import json
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash
from utils.state_machine import can_transition, normalize_booking_status, BOOKING_STATUSES

def init_business_booking_routes(app, get_db, send_email_async=None, generate_random_password=None):
    business_bp = Blueprint('business_booking', __name__)

    # Helper function to calculate cost
    def calculate_business_cost(category, area_sqft, num_floors=1, business_size='medium'):
        # Base costs mapping (same as in the frontend)
        BASE_COSTS = {
            'retail-store': 12000,
            'restaurant': 12000,
            'office-space': 10000,
            'hotel': 18000,
            'real-estate': 20000,
            'shopping-mall': 20000,
            'adventure-park': 15000,
            'activity-zone': 12000,
        }

        # Size multipliers (same as in the frontend)
        SIZE_MULTIPLIERS = {
            'small': 1.0,
            'medium': 1.5,
            'large': 2.0,
            'extra-large': 3.0,
            'enterprise': 0,
        }

        if category not in BASE_COSTS:
            # Fallback if names are slightly different
            mapped_category = category.replace('-', ' ') # simple attempt
            # Let's just use 10000 as default if not found
            base_cost = BASE_COSTS.get(category, 10000)
        else:
            base_cost = BASE_COSTS[category]

        size_multiplier = SIZE_MULTIPLIERS.get(business_size, 1.0)
        
        if business_size == 'enterprise':
            return 0, None
            
        total_cost = base_cost * size_multiplier
        
        # We can still add a small floor adjustment if desired, 
        # but the frontend doesn't seem to do it currently.
        # Let's stick to frontend logic for now.
        
        return int(total_cost), None

    @business_bp.route('/api/business/calculate-cost', methods=['POST'])
    def calculate_business_cost_route():
        data = request.get_json()
        
        try:
            category = data.get('category')
            area_sqft = float(data.get('area', 0))
            num_floors = int(data.get('num_floors', 1))
            business_size = data.get('business_size', 'medium')
            
            cost, error = calculate_business_cost(category, area_sqft, num_floors, business_size)
            
            if error:
                return jsonify({
                    'success': False,
                    'error': error
                }), 400
                
            return jsonify({
                'success': True,
                'cost': cost,
                'advance_payment': cost / 2  # 50% advance
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    @business_bp.route('/api/business/bookings', methods=['POST'])
    def create_business_booking():
        conn = get_db()
        cursor = conn.cursor()
        try:
            # Handle both JSON and form data
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()
            
            files = request.files
            
            # Basic validation
            required_fields = [
                'business_name', 'owner_name', 'phone', 'email',
                'category', 'area', 'address', 'preferred_date'
            ]
            
            for field in required_fields:
                if not data.get(field):
                    return jsonify({
                        'success': False,
                        'error': f'{field.replace("_", " ").title()} is required'
                    }), 400
            
            # Handle file uploads if any
            attachments = []
            if 'attachments' in files:
                upload_folder = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'business_attachments')
                os.makedirs(upload_folder, exist_ok=True)
                
                for file in files.getlist('attachments'):
                    if file.filename == '':
                        continue
                        
                    filename = f"{uuid.uuid4()}_{secure_filename(file.filename)}"
                    filepath = os.path.join(upload_folder, filename)
                    file.save(filepath)
                    attachments.append({
                        'filename': file.filename,
                        'path': filepath,
                        'size': os.path.getsize(filepath)
                    })
            
            # Calculate cost
            area = float(data.get('area', 0))
            num_floors = int(data.get('num_floors', 1))
            business_size = data.get('business_size', 'medium')
            cost, error = calculate_business_cost(data['category'], area, num_floors, business_size)
            
            if error:
                return jsonify({'success': False, 'error': error}), 400
            
            user_id = data.get('user_id')
            auto_created = False
            plain_password = None

            # Check if user exists by ID
            if user_id:
                cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
                if not cursor.fetchone():
                    user_id = None

            # If no user_id, check by email and auto-create account
            if not user_id:
                email = data.get('email', '')
                cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
                existing = cursor.fetchone()
                if existing:
                    user_id = existing['id']
                elif email and generate_random_password:
                    plain_password = generate_random_password(10)
                    pw_hash = generate_password_hash(plain_password)
                    owner_name = data.get('owner_name', data.get('brand_name', 'Business Client'))
                    cursor.execute(
                        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'client')",
                        (owner_name, email, pw_hash)
                    )
                    user_id = cursor.lastrowid
                    auto_created = True

            # Serialize per-floor areas as JSON string
            floor_areas_raw = data.get('floor_areas', [])
            if isinstance(floor_areas_raw, str):
                floor_areas_json = floor_areas_raw  # already serialized
            else:
                floor_areas_json = json.dumps(floor_areas_raw)

            # Insert into bookings table
            cursor.execute("""
                INSERT INTO bookings (
                    user_id, location_address, property_type, area_size, area_unit,
                    num_floors, preferred_date, preferred_time, special_requirements,
                    base_package_cost, total_cost, status, payment_status,
                    guest_name, guest_email, guest_phone, booking_category,
                    business_size, brand_name, owner_social_link,
                    company_name, company_social_link, floor_areas, referral_code,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                data['address'],
                data['category'],
                area,
                'sq_ft',
                num_floors,
                data['preferred_date'],
                data.get('preferred_time', 'Morning'),
                data.get('notes', ''),
                cost,
                cost,
                'REQUESTED',
                'ESCROW',
                data['owner_name'],
                data['email'],
                data['phone'],
                'business',
                business_size,
                data.get('brand_name', ''),
                data.get('owner_social_link', ''),
                data.get('company_name', ''),
                data.get('company_social_link', ''),
                floor_areas_json,
                data.get('referral_id', ''),
                datetime.utcnow().isoformat(),
                datetime.utcnow().isoformat()
            ))
            
            booking_id = cursor.lastrowid
            
            # Update user's BBD status
            if user_id:
                cursor.execute("UPDATE users SET bbd_form_submitted = 1 WHERE id = ?", (user_id,))
            
            conn.commit()

            # Send welcome email with credentials if a new account was created
            if auto_created and plain_password and send_email_async:
                owner_name = data.get('owner_name', data.get('brand_name', 'Business Client'))
                email = data.get('email', '')
                subject = "Welcome to HMX Hub – Your Account Credentials"
                body = f"""
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#7c3aed;">Welcome to HMX Hub, {owner_name}!</h2>
  <p>Your business booking has been submitted successfully. We have created a client account for you to track your booking status.</p>
  <div style="background:#f5f3ff;border:1px solid #ede9fe;border-radius:12px;padding:20px;margin:20px 0;">
    <p style="margin:0 0 8px;"><strong>Login Email:</strong> {email}</p>
    <p style="margin:0;"><strong>Password:</strong> {plain_password}</p>
  </div>
  <p>Login at <a href="http://localhost:5173/login" style="color:#7c3aed;">http://localhost:5173/login</a> to track your booking status.</p>
  <p style="color:#888;font-size:12px;">Please change your password after your first login.</p>
  <p>— The HMX Team</p>
</body></html>
"""
                send_email_async(email, subject, body, is_html=True)

            return jsonify({
                'success': True,
                'message': 'BBD form submitted successfully. Waiting for admin approval.',
                'booking_id': booking_id,
                'cost': cost,
                'account_created': auto_created
            })
            
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'error': f'Failed to create booking: {str(e)}'
            }), 500
        finally:
            conn.close()

    @business_bp.route('/api/admin/business-bookings', methods=['GET'])
    def get_all_business_bookings():
        conn = get_db()
        cursor = conn.cursor()
        try:
            status_filter = request.args.get('status', '')
            search = request.args.get('search', '')

            query = """
                SELECT id, brand_name, guest_name, guest_email, guest_phone,
                       property_type, location_address, area_size, business_size,
                       preferred_date, preferred_time, total_cost, status,
                       payment_status, referral_code, special_requirements,
                       company_name, owner_social_link, company_social_link,
                       num_floors, created_at
                FROM bookings
                WHERE booking_category = 'business'
            """
            params = []

            if status_filter:
                query += " AND status = ?"
                params.append(status_filter)

            if search:
                query += " AND (brand_name LIKE ? OR guest_name LIKE ? OR guest_email LIKE ? OR guest_phone LIKE ?)"
                like = f"%{search}%"
                params.extend([like, like, like, like])

            query += " ORDER BY created_at DESC"

            cursor.execute(query, params)
            rows = cursor.fetchall()
            bookings = [dict(r) for r in rows]
            return jsonify({'success': True, 'bookings': bookings})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
        finally:
            conn.close()

    @business_bp.route('/api/admin/business-bookings/<int:booking_id>/status', methods=['PUT'])
    def update_business_booking_status(booking_id):
        conn = get_db()
        cursor = conn.cursor()
        try:
            data = request.get_json()
            new_status = data.get('status')
            admin_comments = data.get('admin_comments', '')

            if not new_status:
                return jsonify({'success': False, 'error': 'status is required'}), 400

            cursor.execute("SELECT status FROM bookings WHERE id = ? AND booking_category = 'business'", (booking_id,))
            existing = cursor.fetchone()
            if not existing:
                return jsonify({'success': False, 'error': 'Booking not found'}), 404

            current_status = normalize_booking_status(existing['status'])
            target_status = normalize_booking_status(new_status)

            if target_status not in BOOKING_STATUSES:
                return jsonify({'success': False, 'error': 'Invalid status value'}), 400

            if not can_transition(current_status, target_status):
                return jsonify({'success': False, 'error': 'Invalid status transition'}), 400

            cursor.execute("""
                UPDATE bookings
                SET status = ?, admin_comments = ?, updated_at = ?
                WHERE id = ? AND booking_category = 'business'
            """, (target_status, admin_comments, datetime.utcnow().isoformat(), booking_id))
            conn.commit()
            return jsonify({'success': True})
        except Exception as e:
            conn.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
        finally:
            conn.close()

    @business_bp.route('/api/business/status/<int:user_id>', methods=['GET'])
    def get_bbd_status(user_id):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT bbd_form_submitted FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()
            if not user:
                return jsonify({'success': False, 'error': 'User not found'}), 404
            
            # Find the latest business booking for this user
            cursor.execute("""
                SELECT id, status, total_cost, payment_status 
                FROM bookings 
                WHERE user_id = ? AND booking_category = 'business'
                ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            booking = cursor.fetchone()
            
            return jsonify({
                'success': True,
                'bbd_submitted': bool(user['bbd_form_submitted']),
                'booking': dict(booking) if booking else None
            })
        finally:
            conn.close()

    # Area Mismatch Routes
    @business_bp.route('/api/business/report-mismatch', methods=['POST'])
    def report_mismatch():
        data = request.get_json()
        booking_id = data.get('booking_id')
        actual_area = float(data.get('actual_area', 0))
        pilot_id = data.get('pilot_id')
        
        conn = get_db()
        cursor = conn.cursor()
        try:
            # Get original booking details
            cursor.execute("SELECT property_type, area_size, num_floors, total_cost, business_size FROM bookings WHERE id = ?", (booking_id,))
            booking = cursor.fetchone()
            if not booking:
                return jsonify({'success': False, 'error': 'Booking not found'}), 404
            
            # Calculate extra cost
            # New total cost = Base + (Actual Area * 1)
            # Extra cost = New total cost - Original total cost (ignoring floors for simplicity in extra calculation, or including them)
            
            # Let's use the helper to recalculate
            new_total_cost, error = calculate_business_cost(booking['property_type'], actual_area, booking['num_floors'], booking['business_size'])
            extra_cost = new_total_cost - booking['total_cost']
            
            cursor.execute("""
                UPDATE bookings 
                SET actual_area_size = ?, 
                    area_mismatch_status = 'reported',
                    extra_cost = ?,
                    status = 'locked_mismatch'
                WHERE id = ?
            """, (actual_area, extra_cost, booking_id))
            
            conn.commit()
            return jsonify({'success': True, 'extra_cost': extra_cost})
        finally:
            conn.close()

    @business_bp.route('/api/business/resolve-mismatch', methods=['POST'])
    def resolve_mismatch():
        data = request.get_json()
        booking_id = data.get('booking_id')
        choice = data.get('choice') # 'pay_extra' or 'keep_original'
        
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT extra_cost, total_cost, area_mismatch_status FROM bookings WHERE id = ?", (booking_id,))
            booking = cursor.fetchone()
            
            if not booking or booking['area_mismatch_status'] != 'reported':
                return jsonify({'success': False, 'error': 'Invalid booking or no mismatch reported'}), 400
            
            if choice == 'pay_extra':
                new_total = booking['total_cost'] + booking['extra_cost']
                cursor.execute("""
                    UPDATE bookings 
                    SET total_cost = ?, 
                        area_mismatch_status = 'resolved',
                        area_mismatch_choice = 'pay_extra',
                        status = 'approved', -- Unlocked
                        payment_status = 'pending_extra'
                    WHERE id = ?
                """, (new_total, booking_id))
            else:
                cursor.execute("""
                    UPDATE bookings 
                    SET area_mismatch_status = 'resolved',
                        area_mismatch_choice = 'keep_original',
                        status = 'approved' -- Unlocked
                    WHERE id = ?
                """, (booking_id,))
            
            conn.commit()
            return jsonify({'success': True})
        finally:
            conn.close()

    # Return the blueprint (registration happens in app.py)
    return business_bp
