def distribute_payment(booking):
    total = float(booking.get("total_cost") or booking.get("payment_amount") or 0)

    pilot_share = round(total * 0.5, 2)
    editor_share = round(total * 0.3, 2)
    platform_share = round(total * 0.2, 2)

    # Placeholder for gateway transfers (Razorpay/Stripe/PhonePe split transfers).
    return {
        "total": total,
        "pilot_share": pilot_share,
        "editor_share": editor_share,
        "platform_share": platform_share,
        "transfer_status": "simulated",
    }
