# Guest Signup with Referral Flow - Complete Implementation

## Overview
This document describes the complete implementation of the guest signup and order booking flow with referral tracking and earnings calculation.

## User Flow

### 1. Welcome Page
- User sees a new "Guest Order (with Referral)" button on the welcome page
- Clicking this navigates to `/guest-signup`

### 2. Guest Signup (`/guest-signup`)
**Step 1: Basic Details & Email Verification**
- User enters:
  - Name
  - Email
  - Phone
- System sends OTP to email for verification
- User enters OTP to verify email
- Once verified, proceeds to Step 2

**Step 2: Address & Referral Information**
- User enters:
  - Address
  - Referral Link (optional) - e.g., `https://hmx.in/ref/274b0632`
  - Referral Code (optional) - e.g., `274b0632`
- Guest info is saved to localStorage
- User proceeds to booking

### 3. Guest Order Booking (`/guest-booking`)
**Step 1: Project Details**
- Location Address
- GPS Link (Google Maps)
- Property Type (dropdown with pricing categories)
- Indoor/Outdoor
- Area Size (with unit: sq_ft or acres)
- Number of Rooms/Sections
- Number of Floors
- Preferred Date & Time
- Special Requirements

*Auto-calculated costs based on property type, area, and floors*

**Step 2: Review & Submit**
- Shows summary of all entered information
- Displays calculated Base Cost and Total Cost
- User confirms and submits order

### 4. Payment
- PhonePe payment modal appears
- Guest completes payment
- On success:
  - Order is created in database
  - Referral is credited (if provided)
  - Guest info is cleared from localStorage
  - User is redirected to home page

## Backend Implementation

### Database Schema Updates
**Bookings Table - New Columns:**
```sql
- guest_name TEXT
- guest_email TEXT
- guest_phone TEXT
- guest_address TEXT
- referral_id INTEGER (already existed)
```

### API Endpoints

#### 1. Guest Booking Creation
**Endpoint:** `POST /api/guest/bookings`
**Access:** Public (no authentication required)

**Request Body:**
```json
{
  "location_address": "123 Main St",
  "gps_link": "https://maps.google.com/...",
  "property_type": "Retail Store / Showroom",
  "indoor_outdoor": "indoor",
  "area_size": 2000,
  "area_unit": "sq_ft",
  "rooms_sections": 5,
  "num_floors": 1,
  "preferred_date": "2025-10-25",
  "preferred_time": "10:00",
  "special_requirements": "Need extra lighting",
  "base_package_cost": 5999,
  "total_cost": 5999,
  "guest_name": "John Doe",
  "guest_email": "john@example.com",
  "guest_phone": "1234567890",
  "guest_address": "456 Oak Ave",
  "referral_link": "https://hmx.in/ref/274b0632",
  "referral_code": "274b0632"
}
```

**Response:**
```json
{
  "id": 123,
  "status": "pending",
  "payment_status": "pending",
  ...
}
```

**Backend Logic:**
1. Validates referral code/link if provided
2. Extracts referral code from link (e.g., `https://hmx.in/ref/274b0632` → `274b0632`)
3. Looks up active referral partner by code
4. Creates booking with guest info and referral_id
5. Increments referral's `total_referrals` counter
6. Returns created booking

### Referral Earnings Calculation

**When Order is Completed:**
- System calculates referral earnings: 12.5% of total order cost
- Updates `referral_earnings` field in booking
- Updates `total_earnings` in referrals table
- Referral partner can see earnings in their dashboard

**Earnings Formula:**
```
Referral Earnings = Total Order Cost × 12.5%
```

**Example:**
- Order Total: ₹10,000
- Referral Earnings: ₹1,250 (12.5%)

### Modified Complete Booking Function
When a pilot marks an order as completed:
1. Checks if booking has a referral_id
2. If yes, calculates referral earnings
3. Updates referral's total_earnings
4. Stores referral_earnings in booking record

## Frontend Components

### 1. WelcomePage.tsx
- Added new "Guest Order (with Referral)" button
- Navigates to `/guest-signup`

### 2. GuestSignupPage.tsx
- Multi-step form for guest registration
- Email OTP verification
- Referral link/code collection
- Stores guest info in localStorage

### 3. GuestBookingPage.tsx
- Reuses ClientDashboard booking logic
- Auto-calculates pricing based on property type and area
- Integrates guest info from localStorage
- PhonePe payment integration
- Clears guest info on success

## Pricing Logic

### Property Types & Base Costs
```javascript
const COSTING_TABLE = {
  "Retail Store / Showroom": [5999, 9999, 15999, 20999, null],
  "Restaurants & Cafes": [7999, 11999, 19999, 25999, null],
  "Fitness & Sports Arenas": [9999, 13999, 22999, 31999, null],
  "Resorts & Farmstays / Hotels": [11999, 17999, 29999, 39999, null],
  "Real Estate Property": [13999, 23999, 37999, 49999, null],
  "Shopping Mall / Complex": [15999, 29999, 47999, 63999, null],
  "Adventure / Water Parks": [12999, 23999, 39999, 55999, null],
  "Gaming & Entertainment Zones": [10999, 19999, 33999, 45999, null],
};

const AREA_RANGES = [1000, 5000, 10000, 50000];
```

### Cost Calculation
1. Select base cost based on property type and area
2. Apply floor multiplier: `Base Cost × (1 + 0.1 × (num_floors - 1))`
3. If area > 50,000 sq ft → "Custom Quote"

**Example:**
- Property: Retail Store / Showroom
- Area: 2000 sq ft (falls in 1000-5000 range)
- Base Cost: ₹9,999
- Floors: 2
- Final Cost: ₹9,999 × (1 + 0.1 × 1) = ₹10,999

## Security Considerations

1. **Email Verification:** OTP sent to guest email before allowing order placement
2. **Referral Validation:** Only active referral partners can receive earnings
3. **Payment Gateway:** PhonePe integration ensures secure payments
4. **Data Storage:** Guest info cleared from localStorage after successful order

## Admin Features

### Referral Management
- View all referral partners
- See total referrals and earnings for each partner
- Track which orders came through which referral
- Approve/reject referral applications

### Order Tracking
- All guest orders appear in admin dashboard
- Can see guest information (name, email, phone, address)
- Can track referral attribution
- Can view referral earnings per order

## Testing Checklist

- [ ] Guest can sign up with email verification
- [ ] Guest can enter referral code/link
- [ ] Order is created with correct guest info
- [ ] Referral code is validated and linked
- [ ] Pricing is calculated correctly
- [ ] Payment flow works end-to-end
- [ ] Referral earnings are calculated on order completion
- [ ] Referral dashboard shows correct earnings
- [ ] Admin can view guest orders
- [ ] Guest info is cleared after successful order

## Future Enhancements

1. **Guest Login:** Allow guests to track their orders
2. **Email Notifications:** Send order confirmation to guest email
3. **Referral Dashboard:** Show detailed breakdown of referred orders
4. **Multiple Referrals:** Support multiple referral codes per order
5. **Referral Tiers:** Different commission rates for different referral levels
6. **Analytics:** Track referral conversion rates and performance

## Files Modified/Created

### Frontend
- `src/pages/WelcomePage.tsx` - Added guest signup button
- `src/pages/GuestSignupPage.tsx` - New file
- `src/pages/GuestBookingPage.tsx` - New file
- `src/App.tsx` - Added routes for guest flows

### Backend
- `backend/app.py` - Added guest booking endpoint and referral earnings logic
- Database schema updated with guest fields

### Documentation
- `GUEST_REFERRAL_FLOW.md` - This file
