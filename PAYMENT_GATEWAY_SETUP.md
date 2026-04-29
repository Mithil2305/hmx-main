# PhonePe Payment Gateway Integration

## Overview
The PhonePe Payment Gateway has been successfully integrated into the application. This integration allows users (specifically guests) to make payments for their bookings.

## Components

### Backend
1.  **Payment Routes** (`backend/routes/payment_routes.py`):
    *   `POST /api/payment/initiate`: Initiates a payment request with PhonePe.
    *   `POST /api/payment/callback`: Handles server-to-server callbacks from PhonePe.
    *   `GET /api/payment/status/<merchant_transaction_id>`: Checks the status of a payment.
    *   `POST /api/payment/admin/refund`: Processes refunds (Admin only).

2.  **App Configuration** (`backend/app.py`):
    *   Registered the `payment` blueprint.
    *   Ensures `payments` table exists in the database.

3.  **Core Logic** (`backend/phonepe_payment.py`):
    *   Handles the interaction with `phonepe-sdk`.
    *   Supports both **Production** and **Sandbox/Mock** modes.

### Frontend
1.  **Payment Component** (`src/components/PhonePePayment.tsx`):
    *   A modal component that initiates the payment and handles the redirect.
2.  **Guest Booking Page** (`src/pages/GuestBookingPage.tsx`):
    *   Integrated the `PhonePePayment` component into the booking flow.
    *   Triggered when "Submit Order & Pay" is clicked.

## How to Test

1.  **Install Dependencies**:
    The system uses the official `phonepe-sdk`.
    ```bash
    pip install -r backend/requirements.txt
    ```

2.  **Restart Backend**:
    Ensure your Flask server is running/restarted to load the new routes.

3.  **Frontend Flow**:
    *   Go to Guest Booking page.
    *   Fill in the details.
    *   Click "Submit Order & Pay".
    *   The Payment Modal will appear.
    *   Click "Pay with PhonePe".
    *   **Mock Mode**: If SDK is not working or configured for test, it will simulate a successful payment locally.
    *   **Real Mode**: It will redirect to PhonePe payment page.

## Configuration
Update `backend/config.py` or `.env` file with your credentials:
```env
PHONEPE_CLIENT_ID=your_client_id
PHONEPE_CLIENT_SECRET=your_client_secret
PHONEPE_ENVIRONMENT=PRODUCTION  # or SANDBOX
```
