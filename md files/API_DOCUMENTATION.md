# HMX API Documentation

## 📋 Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Booking Management](#booking-management)
4. [Payment Integration](#payment-integration)
5. [Video Management](#video-management)
6. [Messaging System](#messaging-system)
7. [Admin Operations](#admin-operations)
8. [Error Codes](#error-codes)

## 🔐 Authentication

### **Base URL**
```
http://localhost:5000/api
```

### **POST /auth/register**
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+1234567890",
  "role": "client"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "client",
      "created_at": "2024-01-15T10:30:00Z"
    },
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

### **POST /auth/login**
Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "client"
    },
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

### **GET /auth/verify**
Verify JWT token and get user info.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "client"
    }
  }
}
```

## 👥 User Management

### **GET /users/profile**
Get current user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+1234567890",
      "address": "123 Main St, City",
      "role": "client",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### **PUT /users/profile**
Update user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "+1234567890",
  "address": "456 Oak St, City"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Smith",
      "phone": "+1234567890",
      "address": "456 Oak St, City"
    }
  }
}
```

### **POST /users/change-password**
Change user password.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## 📅 Booking Management

### **POST /bookings**
Create a new booking.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "service_type": "restaurant",
  "location_details": "123 Main St, City, State 12345",
  "preferred_date": "2024-02-15",
  "preferred_time": "10:00",
  "special_requirements": "Include outdoor seating area and kitchen tour",
  "additional_notes": "Please focus on the ambiance and food presentation"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking": {
      "id": 1,
      "client_id": 1,
      "service_type": "restaurant",
      "location_details": "123 Main St, City, State 12345",
      "preferred_date": "2024-02-15",
      "preferred_time": "10:00",
      "base_cost": 5000,
      "final_cost": 5000,
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### **GET /bookings**
Get user's bookings (filtered by role).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, in_progress, completed, cancelled)
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 1,
        "service_type": "restaurant",
        "location_details": "123 Main St, City",
        "preferred_date": "2024-02-15",
        "base_cost": 5000,
        "final_cost": 5000,
        "status": "pending",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

### **GET /bookings/{id}**
Get specific booking details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 1,
      "client_id": 1,
      "pilot_id": 2,
      "editor_id": 3,
      "service_type": "restaurant",
      "location_details": "123 Main St, City",
      "preferred_date": "2024-02-15",
      "preferred_time": "10:00",
      "special_requirements": "Include outdoor seating area",
      "base_cost": 5000,
      "final_cost": 5000,
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z",
      "client": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "pilot": {
        "id": 2,
        "name": "Jane Smith",
        "experience_years": 5
      }
    }
  }
}
```

### **PUT /bookings/{id}**
Update booking details.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "preferred_date": "2024-02-20",
  "special_requirements": "Updated requirements"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking updated successfully",
  "data": {
    "booking": {
      "id": 1,
      "preferred_date": "2024-02-20",
      "special_requirements": "Updated requirements"
    }
  }
}
```

### **DELETE /bookings/{id}**
Cancel a booking.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully"
}
```

## 💳 Payment Integration

### **POST /payment/initiate**
Initiate PhonePe payment.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "booking_id": 1,
  "amount": 5000
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payment_url": "https://phonepe.com/pay?merchantId=...",
    "merchant_transaction_id": "MT123456789",
    "amount": 5000
  }
}
```

### **GET /payment/status/{merchant_transaction_id}**
Check payment status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "SUCCESS",
    "merchant_transaction_id": "MT123456789",
    "phonepe_transaction_id": "PT123456789",
    "amount": 5000,
    "payment_instrument_type": "UPI"
  }
}
```

### **POST /payment/refund**
Process refund (admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "merchant_transaction_id": "MT123456789",
  "refund_amount": 5000,
  "refund_note": "Customer request"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refund_id": "REF123456789",
    "status": "SUCCESS"
  }
}
```

### **POST /payment/callback**
Handle PhonePe payment callback.

**Request Body:**
```json
{
  "merchantId": "M22ZR5G5PJQK2",
  "merchantTransactionId": "MT123456789",
  "transactionId": "PT123456789",
  "amount": 5000,
  "responseCode": "SUCCESS",
  "checksum": "abc123..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment processed successfully"
}
```

## 🎥 Video Management

### **POST /videos/upload**
Upload video file.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Video file
- `booking_id`: Booking ID
- `video_type`: Type of video (raw, processed)

**Response (201):**
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "video": {
      "id": 1,
      "booking_id": 1,
      "file_path": "/uploads/videos/video_123.mp4",
      "file_size": 52428800,
      "duration": 120,
      "status": "uploading",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### **GET /videos/{booking_id}**
Get videos for a booking.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": 1,
        "booking_id": 1,
        "file_path": "/uploads/videos/video_123.mp4",
        "file_size": 52428800,
        "duration": 120,
        "status": "completed",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### **PUT /videos/{id}**
Update video details.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "completed",
  "duration": 120
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Video updated successfully"
}
```

### **DELETE /videos/{id}**
Delete video file.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

## 💬 Messaging System

### **POST /messages**
Send a message.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "receiver_id": 2,
  "booking_id": 1,
  "content": "Hello, when can we schedule the shoot?"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message": {
      "id": 1,
      "sender_id": 1,
      "receiver_id": 2,
      "booking_id": 1,
      "content": "Hello, when can we schedule the shoot?",
      "is_read": false,
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### **GET /messages/{booking_id}**
Get messages for a booking.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "sender_id": 1,
        "receiver_id": 2,
        "content": "Hello, when can we schedule the shoot?",
        "is_read": false,
        "created_at": "2024-01-15T10:30:00Z",
        "sender": {
          "id": 1,
          "name": "John Doe"
        }
      }
    ]
  }
}
```

### **PUT /messages/{id}/read**
Mark message as read.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Message marked as read"
}
```

## 👨‍💼 Admin Operations

### **GET /admin/users**
Get all users (admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `role` (optional): Filter by role
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user@example.com",
        "name": "John Doe",
        "role": "client",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

### **GET /admin/bookings**
Get all bookings (admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 1,
        "client_id": 1,
        "pilot_id": 2,
        "service_type": "restaurant",
        "status": "pending",
        "base_cost": 5000,
        "final_cost": 5000,
        "created_at": "2024-01-15T10:30:00Z",
        "client": {
          "id": 1,
          "name": "John Doe"
        },
        "pilot": {
          "id": 2,
          "name": "Jane Smith"
        }
      }
    ]
  }
}
```

### **GET /admin/analytics**
Get system analytics (admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_users": 100,
    "total_bookings": 50,
    "total_revenue": 250000,
    "pending_bookings": 10,
    "completed_bookings": 35,
    "cancelled_bookings": 5,
    "monthly_stats": [
      {
        "month": "2024-01",
        "bookings": 15,
        "revenue": 75000
      }
    ]
  }
}
```

## ❌ Error Codes

### **HTTP Status Codes**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

### **Error Response Format**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "email": "Invalid email format"
    }
  }
}
```

### **Common Error Codes**
- `INVALID_CREDENTIALS` - Wrong email/password
- `TOKEN_EXPIRED` - JWT token expired
- `INVALID_TOKEN` - Invalid JWT token
- `USER_NOT_FOUND` - User doesn't exist
- `BOOKING_NOT_FOUND` - Booking doesn't exist
- `PERMISSION_DENIED` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid input data
- `PAYMENT_FAILED` - Payment processing failed
- `FILE_TOO_LARGE` - Uploaded file too large
- `INVALID_FILE_TYPE` - Unsupported file type

### **Rate Limiting**
- API calls are limited to 100 requests per minute per IP
- Exceeding limits returns `429 Too Many Requests`

### **Authentication**
- All protected endpoints require valid JWT token
- Token must be included in Authorization header
- Format: `Authorization: Bearer <token>`

---

**Note:** This API documentation covers the core endpoints. For additional endpoints or specific use cases, please refer to the backend source code or contact the development team.
