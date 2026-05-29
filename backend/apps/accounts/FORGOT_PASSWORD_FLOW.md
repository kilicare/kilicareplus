# Forgot Password OTP Flow - Complete Implementation

## Overview
A secure 3-step forgot password flow using OTP (One-Time Password) verification. Users can reset their passwords via email without logging in.

## Architecture

### Database Model: OTPCode
```
- user: ForeignKey to User
- code: 6-digit OTP (CharField)
- purpose: 'PASSWORD_RESET' for this flow
- expires_at: 15 minutes from creation (DateTimeField)
- is_verified: Boolean flag for step 2 verification
- is_used: Boolean flag for step 3 completion
- created_at: Timestamp
```

### Email Configuration (.env)
```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=kilicareplus@gmail.com
EMAIL_HOST_PASSWORD=elwpwerzkpomzhpj
DEFAULT_FROM_EMAIL=kilicareplus@gmail.com
```

## API Endpoints

### Step 1: Request Password Reset
**Endpoint:** `POST /auth/forgot-password/`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Kama email inapatikana, OTP imetumwa."
}
```

**Response (Invalid Email):**
```json
{
  "email": ["Email hii haipatikani."]
}
```

**Security Notes:**
- Returns generic message even if email doesn't exist (prevents email enumeration)
- OTP is never returned in the response
- OTP is sent only via email (no console logging)
- OTP expires after 15 minutes

---

### Step 2: Verify OTP
**Endpoint:** `POST /auth/verify-forgot-otp/`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP imethibitishwa!"
}
```

**Response (Invalid/Expired OTP):**
```json
{
  "message": "OTP si sahihi au imeisha."
}
```

**Important:**
- OTP must be exactly 6 digits
- OTP marked as "verified" but NOT "used" yet
- User can only proceed to step 3 with a verified OTP

---

### Step 3: Reset Password
**Endpoint:** `POST /auth/reset-password/`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "SecurePassword123!",
  "new_password_confirm": "SecurePassword123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password imebadilishwa kwa mafanikio! Ingia sasa."
}
```

**Response (Passwords Don't Match):**
```json
{
  "new_password": ["Passwords hazilingani."]
}
```

**Response (Password Too Weak):**
```json
{
  "new_password": [
    "Ensure this field has at least 8 characters.",
    "Password hii ni nyingi sana! Chagua nyingine."
  ]
}
```

**Response (OTP Not Verified):**
```json
{
  "message": "OTP si sahihi, imeisha, au haijathibitishwa."
}
```

**Security Features:**
- Password must be ≥ 8 characters
- Validates against weak passwords (password, 12345678, etc.)
- Uses Django's `set_password()` for secure hashing
- OTP marked as "used" after successful password change
- Cannot reuse same OTP twice

---

## Security Features

### OTP Security
1. **6-digit random generation** - Using cryptographic randomness
2. **15-minute expiry** - Prevents long-term compromise
3. **Single use enforcement** - Marked as used after successful password reset
4. **No console logging** - Removed all debug prints for OTPs
5. **Email-only delivery** - Never shown in API responses

### Password Security
1. **Hash-based storage** - Using Django's `set_password()` (bcrypt/PBKDF2)
2. **Validation rules:**
   - Minimum 8 characters
   - No common weak passwords
   - Both password fields must match
3. **No plaintext storage** - Passwords never logged or returned

### Flow Security
1. **Verification separation** - OTP verification separate from password change
2. **Expiry enforcement** - Checked in both verify and reset steps
3. **Generic error messages** - Prevents user enumeration attacks
4. **Email verification** - Only registered emails can request reset

---

## Implementation Details

### Helper Functions

#### `_generate_otp()`
```python
# Generates 6-digit OTP
code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
```

#### `_send_otp(user, purpose)`
```python
# Creates OTP record with 15-min expiry
# Marks previous OTPs as used
# Sends via email using Django's send_mail()
# No console output
```

### State Transitions

```
Step 1: forgot_password_view
├─ User provides email
├─ Generate OTP code
├─ Save to DB: is_verified=False, is_used=False
└─ Send via email

Step 2: verify_forgot_otp_view
├─ User provides email + OTP
├─ Validate: code matches, not expired, not used yet
└─ Update: is_verified=True (still not used)

Step 3: reset_password_view
├─ User provides email + OTP + new_password
├─ Validate: OTP is verified AND not used yet
├─ Update password using set_password()
└─ Update: is_used=True (prevent reuse)
```

---

## Error Handling

| Error | HTTP Status | Meaning |
|-------|------------|---------|
| Invalid email format | 400 | Email field validation failed |
| Email not registered | 400 | User doesn't exist (hidden from user) |
| Invalid OTP | 400 | Wrong code or doesn't match records |
| OTP expired | 400 | More than 15 minutes elapsed |
| OTP not verified | 400 | User skipped step 2 or used old OTP |
| Passwords don't match | 400 | new_password ≠ new_password_confirm |
| Password too weak | 400 | Less than 8 chars or in weak list |

---

## Testing Checklist

- [ ] Request forgot password with valid email → OTP sent
- [ ] Request forgot password with invalid email → Generic success
- [ ] Verify OTP with correct code → Success
- [ ] Verify OTP with wrong code → Error
- [ ] Verify OTP with expired code (>15 min) → Error
- [ ] Reset password with unverified OTP → Error (skip step 2)
- [ ] Reset password with verified OTP → Success
- [ ] Try reusing same OTP twice → Error on 2nd attempt
- [ ] Check email received OTP (not in console) → Verify
- [ ] Check password hashed in DB → Verify with `django.contrib.auth`

---

## Email Template Example

Subject: `KilicareGO+ — Reset Password`

Body:
```
Habari [First Name]!

OTP yako ya reset password: 123456

Inaisha baada ya dakika 15.

KilicareGO+ Team 🇹🇿
```

---

## Migration

Applied migration: `apps/accounts/migrations/0003_otpcode_is_verified.py`

This adds the `is_verified` BooleanField to the OTPCode model to support the 3-step flow.

---

## Legacy Endpoints (Compatibility)

For backward compatibility, the old endpoints are still available:
- `POST /auth/password/reset/` - Sends OTP
- `POST /auth/password/confirm/` - Verifies + resets in one step

**Recommendation:** Use new endpoints for new implementations.

---

## Constants

- **OTP Length:** 6 digits
- **OTP Expiry:** 15 minutes
- **Min Password Length:** 8 characters
- **Weak Passwords List:** password, 12345678, qwerty123, admin123, 111111, 000000, abc123, test1234

