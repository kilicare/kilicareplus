# Forgot Password OTP Flow - Quick Reference

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User: "I forgot my password"                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 1: POST /auth/forgot-password/                              │
│ ✓ Send email address                                             │
│ ✓ Generate 6-digit OTP                                          │
│ ✓ Save to DB: is_verified=False, is_used=False                 │
│ ✓ Email OTP to user                                             │
│ ✓ Return: "Kama email inapatikana, OTP imetumwa."              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ User: "I got the OTP in my email"                               │
│ USER ENTERS: 6-digit OTP code                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 2: POST /auth/verify-forgot-otp/                           │
│ ✓ Send email + OTP                                              │
│ ✓ Validate: code exists, not expired, not used                 │
│ ✓ Update DB: is_verified=True (still not used!)                │
│ ✓ Return: "OTP imethibitishwa!"                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ User: "Now I want to set my new password"                        │
│ USER ENTERS: new_password (2x)                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 3: POST /auth/reset-password/                              │
│ ✓ Send email + OTP + new_password + confirmation               │
│ ✓ Validate: OTP is verified AND not used yet                   │
│ ✓ Validate: password requirements (8+ chars, not weak)         │
│ ✓ Update DB: is_used=True                                       │
│ ✓ Set new password: user.set_password(new_password)            │
│ ✓ Return: "Password imebadilishwa kwa mafanikio!"              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ User: "I can now login with my new password"                    │
│ POST /auth/login/ with email + new_password ✓                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Request/Response Examples

### Step 1: Request Password Reset

**cURL:**
```bash
curl -X POST http://localhost:8000/auth/forgot-password/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Python (requests):**
```python
import requests

response = requests.post(
    'http://localhost:8000/auth/forgot-password/',
    json={'email': 'user@example.com'}
)
print(response.json())
# Output: {"success": true, "message": "Kama email inapatikana, OTP imetumwa."}
```

**Response:** User receives email with 6-digit OTP

---

### Step 2: Verify OTP

**cURL:**
```bash
curl -X POST http://localhost:8000/auth/verify-forgot-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "otp": "123456"}'
```

**Python (requests):**
```python
response = requests.post(
    'http://localhost:8000/auth/verify-forgot-otp/',
    json={'email': 'user@example.com', 'otp': '123456'}
)
print(response.json())
# Output: {"success": true, "message": "OTP imethibitishwa!"}
```

---

### Step 3: Reset Password

**cURL:**
```bash
curl -X POST http://localhost:8000/auth/reset-password/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp": "123456",
    "new_password": "SecurePassword123!",
    "new_password_confirm": "SecurePassword123!"
  }'
```

**Python (requests):**
```python
response = requests.post(
    'http://localhost:8000/auth/reset-password/',
    json={
        'email': 'user@example.com',
        'otp': '123456',
        'new_password': 'SecurePassword123!',
        'new_password_confirm': 'SecurePassword123!'
    }
)
print(response.json())
# Output: {"success": true, "message": "Password imebadilishwa kwa mafanikio! Ingia sasa."}
```

---

## Common Error Scenarios

### Error: "OTP si sahihi au imeisha"
**Causes:**
- Entered wrong OTP code
- OTP expired (more than 15 minutes ago)
- OTP already used for password reset

**Solution:** Request new OTP from step 1

---

### Error: "OTP si sahihi, imeisha, au haijathibitishwa"
**Causes:**
- Skipped step 2 (verification)
- OTP hasn't been verified yet
- OTP is expired

**Solution:** Must complete step 2 first before step 3

---

### Error: "Passwords hazilingani"
**Causes:**
- new_password ≠ new_password_confirm

**Solution:** Ensure both password fields match exactly

---

### Error: "Password lazima iwe herufi 8+"
**Causes:**
- Password less than 8 characters

**Solution:** Use password with 8 or more characters

---

### Error: "Password hii ni nyingi sana!"
**Causes:**
- Using common weak passwords

**Solution:** Use a stronger password (avoid: password, 12345678, qwerty123, etc.)

---

## Implementation Files

| File | Changes |
|------|---------|
| `.env` | EMAIL_BACKEND: console → SMTP |
| `models.py` | Added `is_verified` field to OTPCode |
| `views.py` | Three new endpoints + helper functions |
| `serializers.py` | Three new serializers with validation |
| `urls.py` | Three new URL routes |
| `migrations/` | 0003_otpcode_is_verified.py |

---

## Code Locations

### Main Functions
- **Generate OTP:** `apps/accounts/views.py:_generate_otp()`
- **Send OTP:** `apps/accounts/views.py:_send_otp(user, purpose)`
- **View 1:** `apps/accounts/views.py:forgot_password_view()`
- **View 2:** `apps/accounts/views.py:verify_forgot_otp_view()`
- **View 3:** `apps/accounts/views.py:reset_password_view()`

### Serializers
- `apps/accounts/serializers.py:ForgotPasswordSerializer`
- `apps/accounts/serializers.py:VerifyForgotOTPSerializer`
- `apps/accounts/serializers.py:ResetPasswordSerializer`

### Model
- `apps/accounts/models.py:OTPCode`

### Tests
- `apps/accounts/test_forgot_password.py`

### Documentation
- `apps/accounts/FORGOT_PASSWORD_FLOW.md` (detailed)
- `apps/accounts/FORGOT_PASSWORD_QUICK_REF.md` (this file)

---

## Testing in Django Shell

```python
# Start Django shell
python manage.py shell

# Import utilities
from apps.accounts.test_forgot_password import test_forgot_password_flow

# Run quick test
test_forgot_password_flow()
```

Or run full test suite:
```bash
python manage.py test apps.accounts.test_forgot_password.ForgotPasswordFlowTestCase
```

---

## Database State Examples

### After Step 1 (OTP created, not verified, not used)
```
OTPCode:
├─ user: User@example.com
├─ code: "123456"
├─ purpose: "PASSWORD_RESET"
├─ expires_at: 2024-01-15 14:15:00 (+15 min)
├─ is_verified: False  ◄── Not verified yet
├─ is_used: False      ◄── Not used yet
└─ created_at: 2024-01-15 14:00:00
```

### After Step 2 (OTP verified, still not used)
```
OTPCode:
├─ user: User@example.com
├─ code: "123456"
├─ purpose: "PASSWORD_RESET"
├─ expires_at: 2024-01-15 14:15:00
├─ is_verified: True   ◄── ✓ NOW VERIFIED
├─ is_used: False      ◄── Still available
└─ created_at: 2024-01-15 14:00:00
```

### After Step 3 (OTP used, cannot be reused)
```
OTPCode:
├─ user: User@example.com
├─ code: "123456"
├─ purpose: "PASSWORD_RESET"
├─ expires_at: 2024-01-15 14:15:00
├─ is_verified: True
├─ is_used: True       ◄── ✓ NOW USED (cannot reuse)
└─ created_at: 2024-01-15 14:00:00

User:
├─ password: hash(new_password)  ◄── ✓ PASSWORD CHANGED
```

---

## Security Checklist

- [x] OTP never printed to console
- [x] OTP never returned in API response
- [x] OTP expires after 15 minutes
- [x] OTP marked as used only after successful password change
- [x] Cannot reuse same OTP
- [x] Cannot skip verification step (step 2)
- [x] Passwords hashed with Django's bcrypt/PBKDF2
- [x] Weak password validation
- [x] Generic error messages (prevents user enumeration)
- [x] Email sent via SMTP (not console)

---

## Troubleshooting

### OTP not received in email?
1. Check `.env` EMAIL settings
2. Enable "Less Secure App Access" for Gmail
3. Check spam/junk folder
4. Verify `send_mail()` doesn't raise exceptions

### Migration not applied?
```bash
python manage.py migrate accounts
```

### Tests failing?
```bash
python manage.py test apps.accounts.test_forgot_password -v 2
```

### Views not found (404)?
1. Check `urls.py` has correct paths
2. Restart Django server
3. Verify app is in `INSTALLED_APPS`
