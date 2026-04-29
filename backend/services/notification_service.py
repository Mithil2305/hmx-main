from datetime import datetime


def emit_booking_notification(socketio, booking_id, event, payload=None):
    if socketio is None:
        return

    body = {
        "booking_id": booking_id,
        "event": event,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if payload:
        body.update(payload)

    socketio.emit("booking:status", body)
