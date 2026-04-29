from app import app, get_db, init_db
from werkzeug.security import generate_password_hash
import os

def verify_database_state():
    conn = get_db()
    cursor = conn.cursor()
    
    # Check users table
    print("\n=== Database State ===")
    users = cursor.execute('SELECT * FROM users').fetchall()
    print(f"Total users in database: {len(users)}")
    
    for user in users:
        print(f"\nUser details:")
        print(f"ID: {user['id']}")
        print(f"Email: {user['email']}")
        print(f"Role: {user['role']}")
        print(f"Approval status: {user['approval_status']}")
        print(f"Business name: {user['business_name']}")
    
    conn.close()
    print("\n===================")

def create_admin_user():
    # Initialize database to ensure schema is correct
    init_db()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Admin user details
    admin_data = {
        'name': 'Admin User',
        'email': 'admin@hmx.com',
        'phone': '1234567890',
        'password': 'admin123',  # This will be hashed
        'role': 'admin',
        'approval_status': 'approved'
    }
    
    # Check if admin already exists
    existing_admin = cursor.execute('SELECT * FROM users WHERE email = ?', (admin_data['email'],)).fetchone()
    
    if existing_admin:
        print("Admin user already exists!")
        verify_database_state()
        return
    
    # Create admin user
    password_hash = generate_password_hash(admin_data['password'])
    
    try:
        cursor.execute('''
            INSERT INTO users (
                business_name, 
                contact_name, 
                email, 
                phone, 
                password_hash, 
                role, 
                approval_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            admin_data['business_name'],
            admin_data['contact_name'],
            admin_data['email'],
            admin_data['phone'],
            password_hash,
            admin_data['role'],
            admin_data['approval_status']
        ))
        
        conn.commit()
        print("\nAdmin user created successfully!")
        print(f"Email: {admin_data['email']}")
        print(f"Password: {admin_data['password']}")
        
        # Verify the database state after creation
        verify_database_state()
        
    except Exception as e:
        print(f"\nError creating admin user: {str(e)}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    # Remove existing database if it exists
    if os.path.exists('hmx.db'):
        os.remove('hmx.db')
        print("Removed existing database")
    
    create_admin_user() 