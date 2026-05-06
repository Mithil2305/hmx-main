# HMX FPV Tours - Frontend-Only Build

This is a **frontend-only build** of the HMX FPV Tours application that runs entirely in the browser without requiring a backend server. All data is stored in the browser's localStorage.

## Overview

This build has been modified to work without a backend server. All business logic, authentication, and data storage now happen client-side using:

- **localStorage** for persistent data storage
- **Client-side authentication** with password hashing
- **In-memory calculations** for all business logic
- **Mock implementations** for backend-dependent features

## Demo Credentials

| Role     | Email                 | Password    |
|----------|----------------------|-------------|
| Admin    | admin@hmx.com        | admin123    |
| Client   | client@hmx.com     | client123   |
| Pilot    | pilot@hmx.com        | pilot123    |
| Editor   | editor@hmx.com       | editor123   |
| Referral | referral@hmx.com     | referral123 |

## Features Status

### Fully Working (Frontend-Only)
- User registration and login (all roles: client, pilot, editor, referral, admin)
- OTP verification (mock - accepts any 6-digit code, demo: 123456)
- Business Booking Form (BBD) with cost calculation
- Booking creation and management
- Pilot acceptance and assignment
- Editor assignment and video submission
- Client approval workflow
- Dashboard statistics
- Payment processing (mock - always succeeds)
- Profile management
- Password changes

### Limited/Not Available (Require Backend)
- Real-time messaging (Socket.IO) - shows "not available" notice
- Email notifications - not available in frontend-only mode
- File uploads - URLs only, no actual file storage
- Push notifications - not available

## Files Modified

### Core Services
- `src/services/localStorageService.ts` - NEW: All localStorage CRUD operations
- `src/services/api.ts` - UPDATED: Uses localStorage instead of API calls
- `src/contexts/AuthContext.tsx` - UPDATED: Uses local auth instead of Firebase
- `src/contexts/SocketContext.tsx` - UPDATED: Disabled real-time features

### Configuration
- `vite.config.ts` - UPDATED: Removed backend proxy configuration
- `.env.frontend-only` - NEW: Environment variables for frontend-only build

### Dashboards (Partial Updates)
- `src/pages/ClientDashboard.tsx` - UPDATED: Uses local data
- `src/pages/PilotDashboard.tsx` - UPDATED: Uses local data
- `src/pages/AdminDashboardNew.tsx` - Uses API (needs update for full functionality)
- `src/pages/EditorDashboard.tsx` - Uses API (needs update for full functionality)
- `src/pages/ReferralDashboard.tsx` - Uses API (needs update for full functionality)

## Data Structure

All data is stored in localStorage with the following keys:

- `hmx_users` - Client and admin users
- `hmx_pilots` - Pilot registrations
- `hmx_editors` - Editor registrations
- `hmx_referrals` - Referral partners
- `hmx_bookings` - Bookings
- `hmx_business_bookings` - Business booking form submissions
- `hmx_messages` - Messages (local only)
- `hmx_payments` - Payment records
- `hmx_current_user` - Current session user

## How to Run

### Development Mode
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

The build output will be in the `dist` folder.

## Deployment

This frontend-only build can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting

No server-side configuration is required.

## Cost Calculations (Frontend)

All cost calculations now happen in the frontend:

```typescript
const sizeCosts = {
  'small': 5000,
  'medium': 10000,
  'large': 20000,
  'extra-large': 40000,
  'enterprise': 0  // Custom quote
};
```

## Important Notes

1. **Data Persistence**: Data is stored in browser localStorage. Clearing browser data will reset all users and bookings.

2. **Security**: This is a demo/development build. Passwords are hashed with a simple client-side hash (not bcrypt). Do not use for production without proper security review.

3. **Multi-user**: Since data is stored in localStorage, each browser/device will have its own separate data store. Users created on one browser won't appear on another.

4. **File Uploads**: File uploads are simulated - only URLs are stored, not actual files.

## Remaining Work (For Full Conversion)

The following files still reference axios and need updating for complete backend independence:

- `src/pages/AdminDashboardNew.tsx` - Admin dashboard API calls
- `src/pages/EditorDashboard.tsx` - Editor dashboard API calls  
- `src/pages/ReferralDashboard.tsx` - Referral dashboard API calls
- `src/pages/BusinessBookingForm.tsx` - Form submission API calls
- `src/pages/LoginPage.tsx` - Login form API calls
- `src/pages/SignupPage.tsx` - Signup form API calls

To complete the conversion, search for `axios` imports and replace with calls to `localAuth`, `localDB`, or services from `api.ts`.

## Browser Compatibility

Works in all modern browsers that support:
- localStorage
- ES6+ JavaScript
- React 18

## License

Same as original project.
