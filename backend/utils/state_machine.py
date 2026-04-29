BOOKING_STATUSES = (
    "REQUESTED",
    "PILOT_ASSIGNED",
    "SHOOT_COMPLETED",
    "EDITING",
    "EDIT_SUBMITTED",
    "REVISION_REQUESTED",
    "APPROVED",
    "COMPLETED",
)

VALID_TRANSITIONS = {
    "REQUESTED": ["PILOT_ASSIGNED"],
    "PILOT_ASSIGNED": ["SHOOT_COMPLETED"],
    "SHOOT_COMPLETED": ["EDITING"],
    "EDITING": ["EDIT_SUBMITTED"],
    "EDIT_SUBMITTED": ["APPROVED", "REVISION_REQUESTED"],
    "REVISION_REQUESTED": ["EDITING"],
    "APPROVED": ["COMPLETED"],
    "COMPLETED": [],
}

LEGACY_TO_PIPELINE = {
    "pending": "REQUESTED",
    "available": "REQUESTED",
    "assigned": "PILOT_ASSIGNED",
    "in_progress": "PILOT_ASSIGNED",
    "editing": "EDITING",
    "approved": "APPROVED",
    "completed": "COMPLETED",
}


def normalize_booking_status(status):
    if not status:
        return "REQUESTED"
    key = str(status).strip()
    if key in BOOKING_STATUSES:
        return key
    return LEGACY_TO_PIPELINE.get(key.lower(), key)


def can_transition(current, nxt):
    current_normalized = normalize_booking_status(current)
    next_normalized = normalize_booking_status(nxt)
    return next_normalized in VALID_TRANSITIONS.get(current_normalized, [])
