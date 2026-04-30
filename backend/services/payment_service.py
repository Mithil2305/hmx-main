from utils.state_machine import normalize_booking_status


class PaymentDistributionError(Exception):
    pass


def distribute_payment(booking):
    booking_status = normalize_booking_status(booking.get("status"))
    if booking_status != "APPROVED":
        raise PaymentDistributionError("Payment can only be distributed after approval")

    total = float(
        booking.get("amount")
        or booking.get("payment_amount")
        or booking.get("total_cost")
        or 0
    )
    if total <= 0:
        raise PaymentDistributionError("Invalid booking amount for distribution")

    pilot_share = round(total * 0.5, 2)
    editor_share = round(total * 0.3, 2)
    platform_share = round(total * 0.2, 2)

    # Placeholder for gateway transfers (Razorpay/Stripe/PhonePe split transfers).
    return {
        "total": total,
        "pilot_share": pilot_share,
        "editor_share": editor_share,
        "platform_share": platform_share,
        "transfer_status": "released",
    }
