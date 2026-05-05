# HMX FPV Tours - Firebase Backend Setup

This is a dummy working version of the HMX FPV Tours application with Firebase Firestore as the backend database.

## Features

- **Firebase Firestore** for data storage (with mock fallback when not configured)
- **JWT Authentication** for all user types
- **All Forms Functional**:
  - Client/Business signup with OTP verification
  - Pilot signup with full profile
  - Editor signup
  - Referral partner signup
  - Business booking form (BBD)
- **Complete Booking Flow**:
  - Client creates booking
  - Admin approves and assigns pilot
  - Pilot accepts and completes shoot
  - Editor processes footage
  - Client approves final delivery
- **Demo Mode** - Works without Firebase credentials using in-memory storage

## Quick Start

### 1. Start the Backend

```bash
# On Windows
start-firebase-backend.bat

# On Mac/Linux
cd backend
source .venv/bin/activate  # or create one: python -m venv .venv
pip install -r requirements-firebase.txt
python firebase_app.py
```

The backend will start on **http://localhost:5001**

### 2. Start the Frontend

```bash
npm install
npm run dev
```

The frontend will start on **http://localhost:5173**

### 3. Demo Credentials

| Role     | Email                 | Password    |
|----------|----------------------|-------------|
| Admin    | admin@hmx.com        | admin123    |
| Pilot    | pilot@hmx.com        | pilot123    |
| Editor   | editor@hmx.com       | editor123   |
| Referral | referral@hmx.com     | referral123 |

## Firebase Setup (Optional)

To use real Firebase instead of mock mode:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Copy the values to `backend/.env` using `backend/.env.firebase.example` as a template

### Required Environment Variables

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register client/business
- `POST /api/auth/login` - Login (all roles)
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/request-otp` - Request OTP (demo: always succeeds)
- `POST /api/auth/verify-otp` - Verify OTP (demo: accepts "123456")

### User Registration
- `POST /api/pilots/register` - Register pilot
- `POST /api/editors/register` - Register editor
- `POST /api/referrals/register` - Register referral partner

### Bookings
- `GET/POST /api/bookings` - Get/create bookings
- `POST /api/bookings/<id>/accept` - Pilot accepts booking
- `POST /api/bookings/<id>/start` - Start booking
- `POST /api/bookings/<id>/complete` - Complete booking
- `POST /api/bookings/<id>/assign-editor` - Admin assigns editor
- `POST /api/bookings/<id>/submit-edit` - Editor submits work
- `POST /api/bookings/<id>/approve` - Client approves delivery

### Business Bookings (BBD)
- `POST /api/business/booking` - Create business booking
- `GET /api/business/booking-status` - Check BBD completion status
- `GET /api/admin/business-bookings` - Admin: get all business bookings
- `PUT /api/admin/orders/<id>` - Admin: update order

### Messages
- `GET/POST /api/messages` - Get/send messages

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/pilots` - Get all pilots
- `GET /api/admin/editors` - Get all editors
- `GET /api/admin/referrals` - Get all referrals
- `GET /api/admin/dashboard` - Get dashboard stats
- `PUT /api/admin/users/<id>/approval` - Approve/reject user

### Client
- `PUT /api/clients/profile` - Update profile
- `PUT /api/clients/password` - Change password
- `GET /api/clients/bookings` - Get my bookings

### Payments (Mock)
- `POST /api/payment/initiate` - Start payment
- `GET /api/payment/status/<id>` - Check payment status
- `POST /api/payment/refund` - Process refund

## Project Structure

```
hmx-main/
├── backend/
│   ├── firebase_app.py          # Main Flask app with Firebase
│   ├── requirements-firebase.txt # Python dependencies
│   ├── .env.firebase.example    # Environment template
│   └── .env                     # Your Firebase credentials (not in git)
├── src/
│   ├── services/api.ts          # Frontend API service
│   ├── contexts/AuthContext.tsx # Auth context
│   └── pages/                   # All pages and forms
├── start-firebase-backend.bat   # Quick start script
└── README-FIREBASE.md          # This file
```

## Development Notes

1. **Mock Mode**: When Firebase credentials are not provided, the app runs with in-memory storage. Data is lost when the server restarts.

2. **OTP Verification**: In demo mode, any 6-digit OTP is accepted. The demo OTP is "123456".

3. **Auto-Approval**: All users are auto-approved in demo mode for easier testing.

4. **Payments**: Payment processing is mocked. All transactions succeed immediately.

5. **File Uploads**: Document uploads should store URLs. In production, integrate with Firebase Storage.

## Troubleshooting

### Port Already in Use
If port 5001 is already in use:
```bash
# Find and kill the process
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

### CORS Errors
The backend is configured to accept requests from localhost:5173 and localhost:5174. If you use a different port, update the CORS configuration in `firebase_app.py`.

### Firebase Connection Errors
If you see Firebase connection errors but want to continue with mock mode, the app will automatically fall back to in-memory storage.
