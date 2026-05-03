from app import get_db, init_db
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import json


DEMO_PASSWORD = "testing123"
DEMO_PASSWORD_HASH = generate_password_hash(DEMO_PASSWORD)

# Services used to simulate lifecycle and payments
from services.booking_service import (
    transition_booking,
    append_edited_version,
    set_auto_approval_deadline,
)
from services.payment_service import distribute_payment, PaymentDistributionError
from services.booking_service import BookingLifecycleError


def pretty_table_label(table_name):
    if table_name == "business_clients":
        return "Business Client"
    return table_name.rstrip("s").replace("_", " ").title()


def now_iso():
    return datetime.utcnow().isoformat(sep=" ", timespec="seconds")


def table_columns(conn, table_name):
    cursor = conn.cursor()
    rows = cursor.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row[1] for row in rows}


def filter_payload(conn, table_name, payload):
    columns = table_columns(conn, table_name)
    return {key: value for key, value in payload.items() if key in columns}


def upsert_by_email(table_name, email, payload):
    conn = get_db()
    cursor = conn.cursor()

    filtered_payload = filter_payload(conn, table_name, payload)
    existing = cursor.execute(
        f"SELECT id FROM {table_name} WHERE email = ?",
        (email,)
    ).fetchone()

    try:
        if existing:
            update_fields = [key for key in filtered_payload.keys() if key != "id"]
            if update_fields:
                cursor.execute(
                    f"""
                    UPDATE {table_name}
                    SET {', '.join(f'{field} = ?' for field in update_fields)}
                    WHERE id = ?
                    """,
                    [filtered_payload[field] for field in update_fields] + [existing[0]]
                )
            conn.commit()
            print(f"✓ {pretty_table_label(table_name)} already exists: {email}")
            return existing[0], conn

        columns = list(filtered_payload.keys())
        placeholders = ", ".join(["?"] * len(columns))
        cursor.execute(
            f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})",
            [filtered_payload[column] for column in columns]
        )
        conn.commit()
        print(f"✅ {pretty_table_label(table_name)} created: {email}")
        return cursor.lastrowid, conn
    except Exception:
        conn.rollback()
        conn.close()
        raise


def create_pilot_account():
    pilot_data = {
        "email": "pilot@demo.com",
        "name": "John Pilot",
        "full_name": "John Michael Pilot",
        "phone": "9876543210",
        "password_hash": DEMO_PASSWORD_HASH,
        "status": "active",
        "experience": "Expert",
        "equipment": "DJI Air 3S",
        "cities": "Mumbai,Pune",
        "is_approved": 1,
        "training_status": "completed"
    }

    pilot_id, conn = upsert_by_email("pilots", pilot_data["email"], pilot_data)
    conn.close()
    return pilot_id


def create_referral_account():
    referral_data = {
        "email": "referral@demo.com",
        "name": "Sarah Referral",
        "phone": "9876543211",
        "status": "active",
        "commission_rate": 10.00,
        "total_earnings": 1800.00,
        "total_referrals": 1,
        "referral_code": "DEMO_REF_001",
        "category": "corporate",
        "referral_source": "demo-seed",
        "password_hash": DEMO_PASSWORD_HASH,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    referral_id, conn = upsert_by_email("referrals", referral_data["email"], referral_data)
    conn.close()
    return referral_id


def create_editor_account():
    editor_data = {
        "email": "editor@demo.com",
        "name": "Michael Editor",
        "full_name": "Michael James Editor",
        "phone": "9876543212",
        "password_hash": DEMO_PASSWORD_HASH,
        "status": "active",
        "approval_status": "approved",
        "years_experience": 5,
        "primary_skills": "Video Editing, Color Grading, Motion Graphics",
        "specialization": "Real Estate Content",
        "role": "editor",
    }

    editor_id, conn = upsert_by_email("editors", editor_data["email"], editor_data)
    conn.close()
    return editor_id


def create_guest_account():
    guest_data = {
        "email": "guest@demo.com",
        "username": "Demo Guest",
        "password_hash": DEMO_PASSWORD_HASH,
        "role": "guest",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    guest_id, conn = upsert_by_email("users", guest_data["email"], guest_data)
    conn.close()
    return guest_id


def create_business_account(referral_id):
    business_email = "business@demo.com"
    business_profile = {
        "email": business_email,
        "username": "Demo Business",
        "password_hash": DEMO_PASSWORD_HASH,
        "role": "client",
        "linked_referral_id": referral_id,
        "bbd_form_submitted": 1,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    business_user_id, conn = upsert_by_email("users", business_email, business_profile)

    business_client_profile = {
        "business_name": "Demo Business Realty",
        "registration_number": "REG-DEMO-001",
        "organization_type": "Private Limited",
        "incorporation_date": "2024-01-15",
        "official_address": "Demo Business Park, Mumbai",
        "official_email": business_email,
        "phone": "9876543213",
        "contact_name": "Demo Business",
        "contact_person_designation": "Founder",
        "email": business_email,
        "password_hash": DEMO_PASSWORD_HASH,
        "status": "active",
        "approval_status": "approved",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    _, conn = upsert_by_email("business_clients", business_email, business_client_profile)
    conn.close()
    return business_user_id


def create_linked_sample_booking(client_id, pilot_id, editor_id, referral_id):
    booking_data = {
        "user_id": client_id,
        "pilot_id": pilot_id,
        "editor_id": editor_id,
        "referral_id": referral_id,
        "location_address": "Demo Business Park, Mumbai",
        "gps_link": "",
        "property_type": "commercial",
        "indoor_outdoor": "indoor",
        "area_size": 4200.0,
        "area_unit": "sq_ft",
        "rooms_sections": 8,
        "num_floors": 4,
        "preferred_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
        "preferred_time": "Morning",
        "special_requirements": "Seeded demo booking linked across client, referral, pilot and editor roles.",
        "drone_permissions_required": 0,
        "base_package_cost": 24000.0,
        "total_cost": 36000.0,
        "custom_quote": "",
        "status": "EDITING",
        "payment_status": "ESCROW",
        "amount": 18000.0,
        "payment_amount": 18000.0,
        "payment_date": None,
        "completed_date": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "admin_comments": "Demo record for role-link testing.",
        "description": "Linked seed booking",
        "delivery_video_link": "",
        "drive_link": "",
        "raw_video_url": "",
        "edited_versions": json.dumps([]),
        "revision_history": json.dumps([]),
        "auto_approve_at": (datetime.utcnow() + timedelta(days=3)).isoformat(sep=" ", timespec="seconds"),
        "pilot_due_at": (datetime.utcnow() + timedelta(days=2)).isoformat(sep=" ", timespec="seconds"),
        "editor_due_at": (datetime.utcnow() + timedelta(days=5)).isoformat(sep=" ", timespec="seconds"),
        "pilot_earnings": 11700.0,
        "editor_earnings": 1800.0,
        "referral_earnings": 1800.0,
        "hmx_earnings": 2700.0,
        "gateway_fees": 900.0,
        "booking_category": "business",
        "business_size": "medium",
        "brand_name": "Demo Business Realty",
        "owner_social_link": "",
        "company_name": "Demo Business Realty Pvt Ltd",
        "company_social_link": "",
        "floor_areas": json.dumps(["1200", "1100", "1000", "900"]),
        "referral_code": "DEMO_REF_001",
        "guest_name": "Demo Business",
        "guest_email": "business@demo.com",
        "guest_phone": "9876543213",
        "guest_address": "Demo Business Park, Mumbai",
    }

    conn = get_db()
    cursor = conn.cursor()
    filtered_payload = filter_payload(conn, "bookings", booking_data)

    existing = cursor.execute(
        """
        SELECT id FROM bookings
        WHERE user_id = ? AND booking_category = ? AND location_address = ?
        """,
        (client_id, "business", "Demo Business Park, Mumbai")
    ).fetchone()

    try:
        if existing:
            update_fields = [key for key in filtered_payload.keys() if key != "id"]
            if update_fields:
                cursor.execute(
                    f"""
                    UPDATE bookings
                    SET {', '.join(f'{field} = ?' for field in update_fields)}
                    WHERE id = ?
                    """,
                    [filtered_payload[field] for field in update_fields] + [existing[0]]
                )
            conn.commit()
            print(f"✓ Linked demo booking already exists: {existing[0]}")
            return existing[0]

        columns = list(filtered_payload.keys())
        placeholders = ", ".join(["?"] * len(columns))
        cursor.execute(
            f"INSERT INTO bookings ({', '.join(columns)}) VALUES ({placeholders})",
            [filtered_payload[column] for column in columns]
        )
        conn.commit()
        booking_id = cursor.lastrowid
        print(f"✅ Linked demo booking created: {booking_id}")
        return booking_id
    except Exception as e:
        conn.rollback()
        print(f"❌ Booking error: {e}")
        return None
    finally:
        conn.close()


def print_summary(client_user_id, referral_id, pilot_id, editor_id, guest_id, booking_id):
    print("\n" + "=" * 60)
    print("DEMO DATA SEED")
    print("=" * 60)
    print(f"Pilot:    pilot@demo.com / {DEMO_PASSWORD} (id: {pilot_id})")
    print(f"Editor:   editor@demo.com / {DEMO_PASSWORD} (id: {editor_id})")
    print(f"Referral: referral@demo.com / {DEMO_PASSWORD} (id: {referral_id})")
    print(f"Client:   business@demo.com / {DEMO_PASSWORD} (id: {client_user_id})")
    print(f"Guest:    guest@demo.com / {DEMO_PASSWORD} (id: {guest_id})")
    print(f"Booking:  linked business booking id {booking_id}")
    print("=" * 60)


def main():
    print("🚀 Seeding linked demo data...\n")
    init_db()

    pilot_id = create_pilot_account()
    referral_id = create_referral_account()
    editor_id = create_editor_account()
    guest_id = create_guest_account()
    client_user_id = create_business_account(referral_id)
    booking_id = create_linked_sample_booking(client_user_id, pilot_id, editor_id, referral_id)

    # Simulate full workflow: pilot accepts, uploads, editor edits, client approves, distribute payment
    if booking_id:
        try:
            simulate_workflow(booking_id, pilot_id, editor_id, client_user_id, referral_id)
        except Exception as e:
            print(f"❌ Workflow simulation failed: {e}")

    if all([pilot_id, referral_id, editor_id, guest_id, client_user_id, booking_id]):
        print_summary(client_user_id, referral_id, pilot_id, editor_id, guest_id, booking_id)
    else:
        print("❌ Seeding completed with one or more failures")


if __name__ == '__main__':
    main()


def simulate_workflow(booking_id, pilot_id, editor_id, client_user_id, referral_id):
    """Simulate: pilot assigned -> shoot completed (raw uploaded) -> editing -> edit submitted -> client approve -> distribute payments"""
    print("\n🔁 Simulating booking lifecycle...\n")
    conn = get_db()
    cursor = conn.cursor()

    # Fetch booking
    cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
    booking = cursor.fetchone()
    if not booking:
        conn.close()
        raise Exception("Booking not found for simulation")

    # 1) Assign pilot (REQUESTED -> PILOT_ASSIGNED)
    try:
        cursor.execute('UPDATE bookings SET pilot_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', (pilot_id, booking_id))
        transition_booking(cursor, booking_id, booking['status'], 'PILOT_ASSIGNED')
        conn.commit()
        print(f"➡️ Pilot assigned (id: {pilot_id}) -> booking {booking_id}")
    except BookingLifecycleError as e:
        conn.rollback()
        print(f"⚠️ Could not assign pilot: {e}")

    # Refresh booking
    cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
    booking = cursor.fetchone()

    # 2) Pilot completes shoot and uploads raw video (PILOT_ASSIGNED -> SHOOT_COMPLETED -> EDITING)
    raw_url = f"https://demo.example.com/raw/{booking_id}/raw_video.mp4"
    try:
        transition_booking(cursor, booking_id, booking['status'], 'SHOOT_COMPLETED')
        cursor.execute('UPDATE bookings SET raw_video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', (raw_url, booking_id))
        # move to editing
        transition_booking(cursor, booking_id, 'SHOOT_COMPLETED', 'EDITING')
        conn.commit()
        print(f"⬇️ Pilot uploaded raw video -> {raw_url}")
    except BookingLifecycleError as e:
        conn.rollback()
        print(f"⚠️ Could not mark shoot completed: {e}")

    # 3) Editor submits edited video (EDITING -> EDIT_SUBMITTED)
    edited_url = f"https://demo.example.com/edited/{booking_id}/final_v1.mp4"
    cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
    booking = cursor.fetchone()
    try:
        append_edited_version(cursor, dict(booking), edited_url)
        cursor.execute('UPDATE bookings SET delivery_video_link = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', (edited_url, booking_id))
        transition_booking(cursor, booking_id, booking['status'], 'EDIT_SUBMITTED')
        set_auto_approval_deadline(cursor, booking_id, days=3)
        conn.commit()
        print(f"✂️ Editor submitted edited video -> {edited_url}")
    except BookingLifecycleError as e:
        conn.rollback()
        print(f"⚠️ Could not submit edit: {e}")

    # 4) Client approves the edit (EDIT_SUBMITTED -> APPROVED -> COMPLETED) and distribute payment
    cursor.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,))
    booking = cursor.fetchone()
    try:
        transition_booking(cursor, booking_id, booking['status'], 'APPROVED')

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
        print(f"✅ Client approved booking. Distribution: {distribution}")
    except BookingLifecycleError as e:
        conn.rollback()
        print(f"⚠️ Approval transition failed: {e}")
    except PaymentDistributionError as e:
        conn.rollback()
        print(f"⚠️ Payment distribution failed: {e}")
    finally:
        conn.close()