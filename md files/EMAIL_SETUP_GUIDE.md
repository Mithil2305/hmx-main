# 📧 Email Setup Guide for HMX FPV Tours

## 🎯 Overview
This guide will help you configure email notifications so that when admins create pilot/editor accounts, the users automatically receive their login credentials via email.

## 🔧 Quick Setup

### 1. **Copy Environment File**
```bash
cd backend
cp .env.example .env
```

### 2. **Configure Gmail (Recommended)**

#### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click "Security" → "2-Step Verification"
3. Follow the setup process

#### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Enter "HMX FPV Tours" as the name
4. Copy the generated 16-character password

#### Step 3: Update .env File
```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
USE_TLS=true
EMAIL_ADDRESS=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

### 3. **Alternative Email Providers**

#### Outlook/Hotmail
```env
SMTP_SERVER=smtp.live.com
SMTP_PORT=587
USE_TLS=true
EMAIL_ADDRESS=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

#### Yahoo Mail
```env
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
USE_TLS=true
EMAIL_ADDRESS=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

#### Custom SMTP
```env
SMTP_SERVER=your-smtp-server.com
SMTP_PORT=587
USE_TLS=true
EMAIL_ADDRESS=your-email@yourdomain.com
EMAIL_PASSWORD=your-password
```

## 🧪 Testing Email Configuration

### 1. **Start the Backend**
```bash
cd backend
python app.py
```

### 2. **Test Email Sending**
Create a test pilot/editor account through the admin dashboard and check if the email is received.

### 3. **Check Logs**
Look for these messages in the backend console:
```
Email sent successfully to user@example.com
Welcome email sent to pilot: user@example.com
```

## 📧 Email Templates

### Account Creation Email Includes:
- ✅ **Welcome message** with role-specific content
- ✅ **Login credentials** (email and auto-generated password)
- ✅ **Security instructions** (change password on first login)
- ✅ **Dashboard links** (direct links to pilot/editor dashboards)
- ✅ **Support contact** information

### Sample Email Content:
```
Subject: Welcome to HMX FPV Tours - Your Pilot Account is Ready!

Dear John Doe,

Welcome to HMX FPV Tours! Your pilot account has been successfully created.

LOGIN CREDENTIALS:
Email: john@example.com
Password: Abc123!@#XYZ

IMPORTANT: Please change your password after first login.

Dashboard: http://localhost:5173/pilot

Best regards,
HMX FPV Tours Team
```

## 🔒 Security Features

### Password Security:
- ✅ **12-character passwords** with mixed case, numbers, symbols
- ✅ **Secure hashing** using bcrypt
- ✅ **Force password change** on first login
- ✅ **No plain text storage** in database

### Email Security:
- ✅ **TLS encryption** for email transmission
- ✅ **App passwords** instead of main passwords
- ✅ **Async sending** to prevent blocking
- ✅ **Error handling** with fallback options

## 🚨 Troubleshooting

### Common Issues:

#### 1. **"Authentication failed" Error**
- ✅ Check if 2FA is enabled (required for Gmail)
- ✅ Use App Password, not regular password
- ✅ Verify email address is correct

#### 2. **"Connection refused" Error**
- ✅ Check SMTP server and port settings
- ✅ Verify firewall/network settings
- ✅ Try different SMTP provider

#### 3. **Emails Not Received**
- ✅ Check spam/junk folder
- ✅ Verify recipient email address
- ✅ Check email provider limits

#### 4. **"TLS Error"**
- ✅ Set `USE_TLS=true` in .env
- ✅ Use port 587 (not 465 or 25)
- ✅ Check if provider supports TLS

### Debug Mode:
Add this to see detailed email logs:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🎯 Production Considerations

### For Production Deployment:
1. **Use dedicated email service** (SendGrid, AWS SES, Mailgun)
2. **Set up SPF/DKIM records** for better deliverability
3. **Use environment variables** for all credentials
4. **Monitor email sending** with proper logging
5. **Set up email templates** in HTML format

### Recommended Services:
- **SendGrid** - Easy setup, good free tier
- **AWS SES** - Cost-effective for high volume
- **Mailgun** - Developer-friendly API
- **Postmark** - High deliverability rates

## ✅ Verification Checklist

- [ ] Environment file (.env) created and configured
- [ ] Email credentials added (use App Password for Gmail)
- [ ] SMTP settings correct for your provider
- [ ] Backend restarted after configuration
- [ ] Test account created successfully
- [ ] Email received with correct credentials
- [ ] User can log in with received credentials
- [ ] Password change functionality works

## 📞 Support

If you encounter issues:
1. Check the backend console for error messages
2. Verify all environment variables are set correctly
3. Test with a different email provider
4. Contact support with specific error messages

---

**Note:** Email configuration is essential for user account management. Without proper email setup, users won't receive their login credentials automatically.
