"""Create test payment records for demonstration"""
import sqlite3
from datetime import datetime, timedelta
import random

conn = sqlite3.connect('hmx.db')
c = conn.cursor()

# Get booking and user info
c.execute('SELECT id, user_id FROM bookings LIMIT 1')
booking = c.fetchone()
booking_id = booking[0] if booking else 1
user_id = booking[1] if booking else 1

print(f"Using Booking ID: {booking_id}, User ID: {user_id}")

# Create test payments
test_payments = [
    {'amount': 15000, 'status': 'completed', 'method': 'phonepe'},
    {'amount': 25000, 'status': 'completed', 'method': 'phonepe'},
    {'amount': 8500, 'status': 'pending', 'method': 'phonepe'},
    {'amount': 35000, 'status': 'completed', 'method': 'phonepe'},
    {'amount': 12000, 'status': 'failed', 'method': 'phonepe'},
]

for i, payment in enumerate(test_payments):
    transaction_id = f"TXN_{booking_id}_{int(datetime.now().timestamp() * 1000) + i * 1000}"
    created_at = (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat()
    
    c.execute('''
        INSERT INTO payments (booking_id, amount, status, payment_method, merchant_transaction_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (booking_id, payment['amount'], payment['status'], payment['method'], transaction_id, created_at, created_at))
    print(f"Created payment: ₹{payment['amount']} - {payment['status']}")

conn.commit()
conn.close()
print("\n✅ Test payment records created successfully!")
