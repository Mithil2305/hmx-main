import json
from datetime import datetime, timedelta

from utils.state_machine import can_transition, normalize_booking_status


class BookingLifecycleError(Exception):
    pass


class BookingValidationError(Exception):
    pass


def _load_json_list(raw):
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def get_actor_id(current_user):
    if not current_user:
        return None
    return current_user.get("user_id") or current_user.get("id")


def transition_booking(cursor, booking_id, current_status, new_status):
    """Perform a guarded booking transition using the global state machine."""
    if not can_transition(current_status, new_status):
        raise BookingLifecycleError("Invalid status transition")

    normalized = normalize_booking_status(new_status)
    cursor.execute(
        """
        UPDATE bookings
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (normalized, booking_id),
    )


def update_booking_status(cursor, booking_id, current_status, new_status):
    transition_booking(cursor, booking_id, current_status, new_status)


def append_edited_version(cursor, booking, edited_url):
    versions = _load_json_list(booking.get("edited_versions"))
    version = len(versions) + 1
    versions.append(
        {
            "url": edited_url,
            "version": version,
            "createdAt": datetime.utcnow().isoformat(),
        }
    )
    cursor.execute(
        "UPDATE bookings SET edited_versions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (json.dumps(versions), booking["id"]),
    )


def append_revision_history(cursor, booking, reason):
    history = _load_json_list(booking.get("revision_history"))
    history.append(
        {
            "reason": reason or "Client requested revision",
            "timestamp": datetime.utcnow().isoformat(),
        }
    )
    cursor.execute(
        "UPDATE bookings SET revision_history = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (json.dumps(history), booking["id"]),
    )


def set_auto_approval_deadline(cursor, booking_id, days=3):
    deadline = (datetime.utcnow() + timedelta(days=days)).isoformat()
    cursor.execute(
        "UPDATE bookings SET auto_approve_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (deadline, booking_id),
    )
