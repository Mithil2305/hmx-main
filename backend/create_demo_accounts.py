from app import app, get_db, init_db
from werkzeug.security import generate_password_hash
from datetime import datetime

# Common password for all demo accounts
DEMO_PASSWORD = "testing123"
DEMO_PASSWORD_HASH = generate_password_hash(DEMO_PASSWORD)


def create_pilot_account():
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
        existing = cursor.execute(
            'SELECT id FROM pilots WHERE email = ?',
            (pilot_data['email'],)
        ).fetchone()

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
        print("✅ Pilot account created")
        return cursor.lastrowid

    except Exception as e:
        print(f"❌ Pilot error: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()


def create_referral_account():
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
        'category': 'corporate',
        'password_hash': DEMO_PASSWORD_HASH,
    }

    try:
        existing = cursor.execute(
            'SELECT id FROM referrals WHERE email = ?',
            (referral_data['email'],)
        ).fetchone()

        if existing:
            print(f"✓ Referral exists: {referral_data['email']}")
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
        print("✅ Referral account created")
        return cursor.lastrowid

    except Exception as e:
        print(f"❌ Referral error: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()


def create_editor_account():
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
        existing = cursor.execute(
            'SELECT id FROM editors WHERE email = ?',
            (editor_data['email'],)
        ).fetchone()

        if existing:
            print(f"✓ Editor exists: {editor_data['email']}")
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
        print("✅ Editor account created")
        return cursor.lastrowid

    except Exception as e:
        print(f"❌ Editor error: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()


def create_guest_account():
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
        existing = cursor.execute(
            'SELECT id FROM users WHERE email = ?',
            (guest_data['email'],)
        ).fetchone()

        if existing:
            print(f"✓ Guest exists: {guest_data['email']}")
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
        print("✅ Guest account created")
        return cursor.lastrowid

    except Exception as e:
        print(f"❌ Guest error: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()


def create_business_account():
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    business_data = {
        'email': 'business@demo.com',
        'username': 'Demo Business',
        'password_hash': DEMO_PASSWORD_HASH,
        'role': 'business'
    }

    try:
        existing = cursor.execute(
            'SELECT id FROM users WHERE email = ?',
            (business_data['email'],)
        ).fetchone()

        if existing:
            print(f"✓ Business exists: {business_data['email']}")
            return existing[0]

        cursor.execute('''
            INSERT INTO users (
                username, email, password_hash, role, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            business_data['username'],
            business_data['email'],
            business_data['password_hash'],
            business_data['role'],
            datetime.now(),
            datetime.now()
        ))

        conn.commit()
        print("✅ Business account created")
        return cursor.lastrowid

    except Exception as e:
        print(f"❌ Business error: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()


def print_summary():
    print("\n" + "=" * 50)
    print("DEMO ACCOUNTS")
    print("=" * 50)

    accounts = [
        ("Pilot", "pilot@demo.com"),
        ("Referral", "referral@demo.com"),
        ("Editor", "editor@demo.com"),
        ("Guest", "guest@demo.com"),
        ("Business", "business@demo.com"),
    ]

    for role, email in accounts:
        print(f"{role}: {email} / {DEMO_PASSWORD}")

    print("=" * 50)


def main():
    print("🚀 Creating demo accounts...\n")

    results = [
        create_pilot_account(),
        create_referral_account(),
        create_editor_account(),
        create_guest_account(),
        create_business_account()
    ]

    if any(results):
        print_summary()
    else:
        print("❌ No accounts created")


if __name__ == '__main__':
    main()