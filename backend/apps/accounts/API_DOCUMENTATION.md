# Forgot Password OTP Flow - Postman Collection

## Base URL
```
http://localhost:8000/auth
```

## Endpoints

### 1. Request Password Reset (Step 1)
```
POST /forgot-password/
Content-Type: application/json

Request Body:
{
  "email": "user@example.com"
}

Success Response (200):
{
  "success": true,
  "message": "Kama email inapatikana, OTP imetumwa."
}

Error Response (400):
{
  "email": ["Email hii haipatikani."]
}
```

**What Happens:**
- ✓ Generates random 6-digit OTP
- ✓ Saves to database with 15-minute expiry
- ✓ Sends OTP via email (NOT console)
- ✓ Returns generic message (security: prevents email enumeration)

---

### 2. Verify OTP (Step 2)
```
POST /verify-forgot-otp/
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "otp": "123456"
}

Success Response (200):
{
  "success": true,
  "message": "OTP imethibitishwa!"
}

Error Response (400):
{
  "message": "OTP si sahihi au imeisha."
}
```

**What Happens:**
- ✓ Validates OTP exists and matches
- ✓ Checks OTP hasn't expired (15-minute window)
- ✓ Checks OTP hasn't been used before
- ✓ Marks OTP as verified (not used yet)
- ✓ Allows user to proceed to step 3

---

### 3. Reset Password (Step 3)
```
POST /reset-password/
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "SecurePassword123!",
  "new_password_confirm": "SecurePassword123!"
}

Success Response (200):
{
  "success": true,
  "message": "Password imebadilishwa kwa mafanikio! Ingia sasa."
}

Error Responses (400):
{
  "message": "Passwords hazilingani."
}

{
  "message": "OTP si sahihi, imeisha, au haijathibitishwa."
}

{
  "new_password": [
    "Ensure this field has at least 8 characters.",
    "Password hii ni nyingi sana! Chagua nyingine."
  ]
}
```

**What Happens:**
- ✓ Validates OTP is verified from step 2
- ✓ Validates OTP hasn't been used before
- ✓ Validates OTP hasn't expired
- ✓ Validates password requirements (8+ chars, not weak)
- ✓ Marks OTP as used (cannot reuse)
- ✓ Sets new password using Django's secure hashing
- ✓ User can now login with new password

---

## Test Data

### Test User Account
```
Email: test@example.com
Username: testuser
Default Password: TestPassword123
```

### Sample OTP Codes
```
123456 - Valid (when configured)
000000 - Invalid (too weak)
111111 - Invalid (too weak)
```

### Sample Passwords
```
GoodPassword123! - Valid (8+ chars, not weak)
SecurePass#456 - Valid
password - Invalid (weak)
12345678 - Invalid (weak)
short - Invalid (too short)
```

---

## Postman Collection Format

```json
{
  "info": {
    "name": "Forgot Password OTP Flow",
    "description": "3-step password reset via OTP",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Step 1 - Request Password Reset",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"email\": \"user@example.com\"}"
        },
        "url": {
          "raw": "http://localhost:8000/auth/forgot-password/",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8000",
          "path": ["auth", "forgot-password", ""]
        }
      }
    },
    {
      "name": "Step 2 - Verify OTP",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"email\": \"user@example.com\", \"otp\": \"123456\"}"
        },
        "url": {
          "raw": "http://localhost:8000/auth/verify-forgot-otp/",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8000",
          "path": ["auth", "verify-forgot-otp", ""]
        }
      }
    },
    {
      "name": "Step 3 - Reset Password",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"email\": \"user@example.com\", \"otp\": \"123456\", \"new_password\": \"NewPassword123!\", \"new_password_confirm\": \"NewPassword123!\"}"
        },
        "url": {
          "raw": "http://localhost:8000/auth/reset-password/",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8000",
          "path": ["auth", "reset-password", ""]
        }
      }
    }
  ]
}
```

---

## cURL Examples

### Step 1: Request Password Reset
```bash
curl -X POST http://localhost:8000/auth/forgot-password/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Step 2: Verify OTP
```bash
curl -X POST http://localhost:8000/auth/verify-forgot-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "otp": "123456"}'
```

### Step 3: Reset Password
```bash
curl -X POST http://localhost:8000/auth/reset-password/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp": "123456",
    "new_password": "NewPassword123!",
    "new_password_confirm": "NewPassword123!"
  }'
```

---

## Python requests Examples

```python
import requests
import json

BASE_URL = "http://localhost:8000/auth"

# Step 1: Request password reset
response1 = requests.post(
    f"{BASE_URL}/forgot-password/",
    json={"email": "user@example.com"}
)
print("Step 1:", response1.json())

# Step 2: Verify OTP
response2 = requests.post(
    f"{BASE_URL}/verify-forgot-otp/",
    json={
        "email": "user@example.com",
        "otp": "123456"  # Would be from email
    }
)
print("Step 2:", response2.json())

# Step 3: Reset password
response3 = requests.post(
    f"{BASE_URL}/reset-password/",
    json={
        "email": "user@example.com",
        "otp": "123456",
        "new_password": "NewPassword123!",
        "new_password_confirm": "NewPassword123!"
    }
)
print("Step 3:", response3.json())

# Now login with new password
login_response = requests.post(
    f"{BASE_URL}/login/",
    json={
        "email": "user@example.com",
        "password": "NewPassword123!"
    }
)
print("Login:", login_response.json())
```

---

## JavaScript/Fetch Examples

```javascript
const BASE_URL = "http://localhost:8000/auth";

// Step 1: Request password reset
async function requestPasswordReset(email) {
  const response = await fetch(`${BASE_URL}/forgot-password/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  return response.json();
}

// Step 2: Verify OTP
async function verifyOTP(email, otp) {
  const response = await fetch(`${BASE_URL}/verify-forgot-otp/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp })
  });
  return response.json();
}

// Step 3: Reset password
async function resetPassword(email, otp, newPassword, newPasswordConfirm) {
  const response = await fetch(`${BASE_URL}/reset-password/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      otp,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm
    })
  });
  return response.json();
}

// Usage
(async () => {
  // Step 1
  const result1 = await requestPasswordReset("user@example.com");
  console.log("Step 1:", result1);
  
  // Step 2 (user enters OTP from email)
  const result2 = await verifyOTP("user@example.com", "123456");
  console.log("Step 2:", result2);
  
  // Step 3 (user enters new password)
  const result3 = await resetPassword(
    "user@example.com",
    "123456",
    "NewPassword123!",
    "NewPassword123!"
  );
  console.log("Step 3:", result3);
})();
```

---

## Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | OTP verified, Password reset |
| 400 | Bad Request | Invalid email, Wrong OTP, Weak password |
| 404 | Not Found | Email doesn't exist |
| 500 | Server Error | Email sending failed |

---

## Response Headers

All responses include:
```
Content-Type: application/json
```

---

## Rate Limiting

Currently no rate limiting. Consider adding:
- Max 5 OTP requests per email per hour
- Max 3 OTP verification attempts per OTP
- Max 1 password reset per user per hour

---

## CORS Headers

If calling from frontend, ensure your backend has:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Frontend
    "http://127.0.0.1:3000",
]
```

---

## Security Headers Recommended

Add to your responses:
```python
# views.py
response['X-Content-Type-Options'] = 'nosniff'
response['X-Frame-Options'] = 'DENY'
response['X-XSS-Protection'] = '1; mode=block'
```

---

## Webhook Events (Optional Future)

Could implement webhooks:
- `password.reset.requested` - When user requests reset
- `password.reset.verified` - When OTP is verified
- `password.reset.completed` - When password is changed
- `password.reset.failed` - When reset fails

---

## API Versioning (Optional Future)

To support multiple versions:
```
/api/v1/auth/forgot-password/
/api/v2/auth/forgot-password/
```

Current version: v1 (implicit)
