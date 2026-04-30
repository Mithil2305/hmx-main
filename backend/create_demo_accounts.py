from app import app, get_db, init_db
from werkzeug.security import generate_password_hash
import os
from datetime import datetime

# Common password for all demo accounts
DEMO_PASSWORD = "testing123"
DEMO_PASSWORD_HASH = generate_password_hash(DEMO_PASSWORD)

def create_pilot_account():
    """Create demo Pilot Hub account"""
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    
    pilot_data = {
        'email': 'pilot@demo.com',
        'name': 'John Pilot',
        'full_name': 'John Michael Pilot',
        'phone': '9876543210',
        'password_hash': DEMO_PASSWORD_HASH,
        'status': 'active',
        'experience': 'Expert',
        'equipment': 'DJI Air 3S'
    }
    
    try:
        # Check if pilot already exists
        existing = cursor.execute('SELECT id FROM pilots WHERE email = ?', (pilot_data['email'],)).fetchone()
        if existing:
            print(f"✓ Pilot account already exists: {pilot_data['email']}")
            return existing[0]
        
        cursor.execute('''
            INSERT INTO pilots (
                name, full_name, email, phone, password_hash, status,
                experience, equipment, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            pilot_data['name'],
            pilot_data['full_name'],
            pilot_data['email'],
            pilot_data['phone'],
            pilot_data['password_hash'],
            pilot_data['status'],
            pilot_data['experience'],
            pilot_data['equipment'],
            datetime.now()
        ))
        
        conn.commit()
        pilot_id = cursor.lastrowid
        print(f"\n✅ Pilot Hub account created successfully!")
        print(f"   Email: {pilot_data['email']}")
        print(f"   Password: {DEMO_PASSWORD}")
        return pilot_id
        
    except Exception as e:
        print(f"❌ Error creating pilot account: {str(e)}")
        conn.rollback()
        return None
    finally:
        conn.close()


def create_referral_account():
    """Create demo Referral Team account"""
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    
    referral_data = {
        'email': 'referral@demo.com',
        'name': 'Sarah Referral',
        'phone': '9876543211',
        'status': 'active',
        'commission_rate': 10.00,
        'referral_code': 'DEMO_REF_001',
        'category': 'corporate'
        'password_hash': DEMO_PASSWORD_HASH,
        'category': 'corporate',
        'password_hash': DEMO_PASSWORD_HASH,
    }
    
    try:
        # Check if referral already exists
        existing = cursor.execute('SELECT id FROM referrals WHERE email = ?', (referral_data['email'],)).fetchone()
        if existing:
            print(f"✓ Referral account already exists: {referral_data['email']}")
            return existing[0]
        
        cursor.execute('''
            INSERT INTO referrals (
                name, email, phone, password_hash, status, commission_rate, 
                referral_code, category, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            referral_data['name'],
            referral_data['email'],
            referral_data['phone'],
                        referral_data['password_hash'],
            referral_data['status'],
            referral_data['commission_rate'],
            referral_data['referral_code'],
            referral_data['category'],
            datetime.now(),
            datetime.now()
        ))
        
        conn.commit()
        referral_id = cursor.lastrowid
        print(f"\n✅ Referral Team account created successfully!")
        print(f"   Email: {referral_data['email']}")
        print(f"   Password: {DEMO_PASSWORD}")
        return referral_id
        
    except Exception as e:
        print(f"❌ Error creating referral account: {str(e)}")
        conn.rollback()
        return None
    finally:
        conn.close()


def create_editor_account():
    """Create demo Creative Editor account"""
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    
    editor_data = {
        'email': 'editor@demo.com',
        'name': 'Michael Editor',
        'full_name': 'Michael James Editor',
        'phone': '9876543212',
        'password_hash': DEMO_PASSWORD_HASH,
        'status': 'active',
        'approval_status': 'approved',
        'years_experience': 5,
        'primary_skills': 'Video Editing, Color Grading, Motion Graphics',
        'specialization': 'Real Estate Content',
        'role': 'editor'
    }
    
    try:
        # Check if editor already exists
        existing = cursor.execute('SELECT id FROM editors WHERE email = ?', (editor_data['email'],)).fetchone()
        if existing:
            print(f"✓ Creative Editor account already exists: {editor_data['email']}")
            return existing[0]
        
        cursor.execute('''
            INSERT INTO editors (
                name, full_name, email, phone, password_hash, status,
                approval_status, years_experience, primary_skills, 
                specialization, role, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            editor_data['name'],
            editor_data['full_name'],
            editor_data['email'],
            editor_data['phone'],
            editor_data['password_hash'],
            editor_data['status'],
            editor_data['approval_status'],
            editor_data['years_experience'],
            editor_data['primary_skills'],
            editor_data['specialization'],
            editor_data['role'],
            datetime.now()
        ))
        
        conn.commit()
        editor_id = cursor.lastrowid
        print(f"\n✅ Creative Editor account created successfully!")
        print(f"   Email: {editor_data['email']}")
        print(f"   Password: {DEMO_PASSWORD}")
        return editor_id
        
    except Exception as e:
        print(f"❌ Error creating editor account: {str(e)}")
        conn.rollback()
        return None
    finally:
        conn.close()


def create_guest_account():
    """Create demo Guest Booking account"""
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    
    guest_data = {
        'email': 'guest@demo.com',
        'username': 'Demo Guest',
        'password_hash': DEMO_PASSWORD_HASH,
        'role': 'guest'
    }
    
    try:
        # Check if guest account already exists
        existing = cursor.execute('SELECT id FROM users WHERE email = ?', (guest_data['email'],)).fetchone()
        if existing:
            print(f"✓ Guest Booking account already exists: {guest_data['email']}")
            return existing[0]
        
        cursor.execute('''
            INSERT INTO users (
                username, email, password_hash, role, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            guest_data['username'],
            guest_data['email'],
            guest_data['password_hash'],
            guest_data['role'],
            datetime.now(),
            datetime.now()
        ))
        
        conn.commit()
        guest_id = cursor.lastrowid
        print(f"\n✅ Guest Booking account created successfully!")
        print(f"   Email: {guest_data['email']}")
        print(f"   Password: {DEMO_PASSWORD}")
        return guest_id
        
    except Exception as e:
        print(f"❌ Error creating guest account: {str(e)}")
        conn.rollback()
        return None
    finally:
        conn.close()


def create_business_account():
    """Create demo Business account"""
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    
    business_user_data = {
        'email': 'business@demo.com',
        'username': 'Demo Business',
        'password_hash': DEMO_PASSWORD_HASH,
        'role': 'business'
    }
    
    try:
        # Check if business account already exists
        existing = cursor.execute('SELECT id FROM users WHERE email = ?', (business_user_data['email'],)).fetchone()
        if existing:
            print(f"✓ Business account already exists: {business_user_data['email']}")
            return existing[0]
        
        cursor.execute('''
            INSERT INTO users (
                username, email, password_hash, role, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            business_user_data['username'],
            business_user_data['email'],
            business_user_data['password_hash'],
            business_user_data['role'],
            datetime.now(),
            datetime.now()
        ))
        
        conn.commit()
        business_id = cursor.lastrowid
        print(f"\n✅ Business account created successfully!")
        print(f"   Email: {business_user_data['email']}")
        print(f"   Password: {DEMO_PASSWORD}")
        return business_id
        
    except Exception as e:
        print(f"❌ Error creating business account: {str(e)}")
        conn.rollback()
        return None
    finally:
        conn.close()


def print_summary():
    """Print a summary of all created accounts"""
    print("\n" + "="*60)
    print("DEMO ACCOUNT CREDENTIALS".center(60))
    print("="*60)
    
    accounts = [
        ("Pilot Hub", "pilot@demo.com", DEMO_PASSWORD),
        ("Referral Team", "referral@demo.com", DEMO_PASSWORD),
        ("Creative Editor", "editor@demo.com", DEMO_PASSWORD),
        ("Guest Booking", "guest@demo.com", DEMO_PASSWORD),
        ("Business", "business@demo.com", DEMO_PASSWORD)
    ]
    
    for role, email, password in accounts:
        print(f"\n{role}:")
        print(f"  Email:    {email}")
        print(f"  Password: {password}")
    
    print("\n" + "="*60)
    print("All accounts use the same password: testing123")
    print("="*60 + "\n")


def main():
    """Create all demo accounts"""
    print("\n" + "="*60)
    print("CREATING DEMO TESTING ACCOUNTS".center(60))
    print("="*60)
    
    # Create all accounts
    pilot_id = create_pilot_account()
    referral_id = create_referral_account()
    editor_id = create_editor_account()
    guest_id = create_guest_account()
    business_id = create_business_account()
    
    # Print summary if at least one account was created
    if pilot_id or referral_id or editor_id or guest_id or business_id:
        print_summary()
    else:
        print("\n❌ Failed to create demo accounts")


if __name__ == '__main__':
    main()
