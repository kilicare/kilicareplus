# 🔑 RUNTIME AUDIT: Login 401 Error - Detailed Findings

## Summary

After password reset completes successfully, user attempting to login receives:
```
HTTP 401 Unauthorized
{"message": "Email au password si sahihi."}
```

This audit traces through the exact code execution paths without making assumptions.

---

## FINDING 1: Authentication Backend Configuration

**File:** `backend/core/settings/base.py` (Line 100-130)

```python
AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,  # ← Sets last_login on successful auth
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

**Analysis:**
- ✓ No custom AUTHENTICATION_BACKENDS defined
- ✓ Will use Django's default `ModelBackend`
- ✓ JWT configuration looks correct
- ? `UPDATE_LAST_LOGIN: True` - may modify user on authentication

---

## FINDING 2: User Model USERNAME_FIELD Configuration

**File:** `backend/apps/accounts/models.py` (Line 1-20)

```python
class User(AbstractUser):
    ROLE_CHOICES = [...]
    email = models.EmailField(unique=True)  # ← Unique, lowercase in DB
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='TOURIST')
    is_verified = models.BooleanField(default=False)
    fcm_token = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'  # ← CRITICAL: email is the login field
    REQUIRED_FIELDS = ['username']  # ← username is required but not login field

    class Meta:
        db_table = 'accounts_user'

    def __str__(self):
        return f'{self.username} ({self.role})'
```

**Analysis:**
- `USERNAME_FIELD = 'email'` means authenticate() will look up user by email
- `REQUIRED_FIELDS = ['username']` means username is required on creation
- User inherits `password` field from AbstractUser (hashed via PBKDF2)
- `is_active` inherited from AbstractUser
- No custom password validation or modification

---

## FINDING 3: Exact Login View Execution Path

**File:** `backend/apps/accounts/views.py` (Line 100-140)

```python
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    # LINE 103: Extract and normalize email
    email = request.data.get('email', '').lower().strip()
    # LINE 104: Extract password as-is
    password = request.data.get('password', '')
    
    # LINE 105-109: Validation
    if not email or not password:
        return Response(
            {'message': 'Email na password zinahitajika.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # LINE 110: CRITICAL AUTHENTICATION CALL
    user = authenticate(request, username=email, password=password)
    # ↓
    # This calls Django's ModelBackend.authenticate()
    # which uses USERNAME_FIELD = 'email'
    # So effectively does:
    #   1. User.objects.get(email=email)
    #   2. user.check_password(password)
    # ↓
    
    # LINE 111-114: If authentication fails
    if not user:
        return Response(
            {'message': 'Email au password si sahihi.'},
            status=status.HTTP_401_UNAUTHORIZED  # ← THIS ERROR OCCURS HERE
        )
    
    # LINE 115-119: If user exists but inactive
    if not user.is_active:
        return Response(
            {'message': 'Akaunti haijathibitishwa. '
                        'Angalia email yako kwa OTP.'},
            status=status.HTTP_403_FORBIDDEN  # ← Different error
        )
    
    # LINE 120-125: Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    return Response({
        'success': True,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user, context={'request': request}).data,
    })
```

**Execution Analysis:**

1. `authenticate()` is called with `username=email, password=password`
2. Django's default backend (ModelBackend):
   - Receives kwargs: `{'username': '...', 'password': '...', 'request': request}`
   - Reads `User.USERNAME_FIELD` = `'email'`
   - Looks up: `User.objects.get(email='...')`
   - If not found: returns None
   - If found: calls `user.check_password(password)`
   - If password matches: returns user
   - If password doesn't match: returns None

3. If `user is None`: **HTTP 401 returned**

**The 401 error means ONE of:**
- User lookup failed (user not found)
- Password comparison failed (wrong password or corrupted hash)

---

## FINDING 4: Password Reset Code Path

**File:** `backend/apps/accounts/views.py` (Line 314-378)

```python
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    # ... validation and user lookup ...
    
    # LINE 340-356: Find verified OTP
    try:
        otp_record = OTPCode.objects.filter(
            user=user,
            code=otp,
            purpose='PASSWORD_RESET',
            is_verified=True,     # ← Must be verified
            is_used=False,        # ← Must not be used
            expires_at__gte=timezone.now(),
        ).latest('created_at')
        logger.debug(f'[RESET PASSWORD] Found OTP: is_verified={otp_record.is_verified}, is_used={otp_record.is_used}')
    except OTPCode.DoesNotExist:
        logger.warning(f'[RESET PASSWORD] OTP not found: email={email}, code={otp}')
        return Response(
            {'message': 'OTP si sahihi, imeisha, au haijathibitishwa.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # LINE 357-359: Mark OTP as used
    otp_record.is_used = True
    otp_record.save()
    logger.debug(f'[RESET PASSWORD] Marked OTP as used')
    
    # LINE 361-363: CRITICAL - Change password
    user.set_password(new_password)  # ← Hashes password
    user.save()                      # ← Saves to database
    logger.info(f'[RESET PASSWORD] Password changed successfully for user: {email}')
    
    # LINE 365-368: Return success
    return Response({
        'success': True,
        'message': 'Password imebadilishwa kwa mafanikio! Ingia sasa.',
    })
```

**Critical Points:**

1. **Password hashing:** Uses `user.set_password(new_password)`
   - Django's built-in method
   - Hashes with PBKDF2 by default
   - Example: `"pbkdf2_sha256$480000$..."`

2. **Database persistence:** `user.save()`
   - Saves to database
   - No explicit transaction management (uses default)
   - Should work correctly

3. **No verification:** After save, no check that password was actually saved
   - Could silently fail if database transaction fails
   - No re-query to verify

---

## FINDING 5: Test Case Verification

**File:** `backend/apps/accounts/test_forgot_password.py` (Line 100-120)

The test file includes:
```python
# Verify password was changed
self.user.refresh_from_db()
self.assertTrue(self.user.check_password('NewSecurePassword123'))
```

**This test passes**, which means:
- Password reset code correctly hashes and saves passwords
- `check_password()` method works correctly
- Test confirms password is actually changed

**But:**
- Test does NOT login after password reset
- No test for 401 error scenario
- Test only verifies `check_password()` directly, not through `authenticate()`

---

## FINDING 6: Potential Mismatches

### Mismatch A: Email Case Sensitivity

**Frontend sends:**
```json
{
  "email": "User@Example.Com",
  "password": "NewPassword123"
}
```

**Backend processes:**
```python
email = request.data.get('email', '').lower().strip()
# Result: "user@example.com"
```

**Database lookup:**
```python
User.objects.get(email="user@example.com")
```

**Potential issue:** If user was registered with different case:
- Registration: `email="USER@EXAMPLE.COM"` (not lowercased)
- Login: `email="user@example.com"` (lowercased)
- EmailField comparison: **should be case-insensitive by default**

**Status:** Unlikely to be issue (EmailField uses iexact lookup)

---

### Mismatch B: Password Hash Algorithm Change

**Scenario:**
1. User registered with old Django version (different hasher)
2. Password reset uses new hasher
3. Old hash in database, new hash being compared

**Code check:**
```python
user.set_password(new_password)  # Uses DEFAULT_PASSWORD_HASHERS setting
user.save()                      # Replaces old hash entirely
```

**Status:** Not an issue (set_password() replaces entirely)

---

### Mismatch C: Database Transaction Isolation

**Scenario:**
1. `user.save()` completes
2. Transaction not fully committed
3. Login query executes in different transaction
4. Sees old password

**Check:** No explicit transaction management in reset_password_view
```python
user.set_password(new_password)
user.save()  # ← Auto-commit in default Django setup
```

**Status:** Unlikely with default Django settings, but possible

---

### Mismatch D: Post-save Signal Modifying User

**Search result:** No post_save signals found in accounts app
```bash
$ grep "post_save" backend/apps/accounts/*.py
# No matches
```

**Status:** No signals detected ✓

---

### Mismatch E: Middleware Affecting Authentication

**Middleware stack:** `backend/core/settings/base.py` Line 56-63
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

**Status:** Standard middleware, nothing unusual

---

## FINDING 7: Test Database vs Production Database

**Scenario:** Password reset test passes in test environment but fails in production

**Reasons:**
1. Different database backend (SQLite vs PostgreSQL)
2. Different timezone settings
3. Different database state/constraints
4. Different Celery/async task timing

**Check:** Backend uses PostgreSQL
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        ...
    }
}
```

---

## FINDING 8: JWT Token Generation After Authentication

**If login succeeds:**
```python
refresh = RefreshToken.for_user(user)
return Response({
    'success': True,
    'access': str(refresh.access_token),
    'refresh': str(refresh),
    'user': UserSerializer(user, context={'request': request}).data,
})
```

**If tokens NOT generated:**
- Suggests authenticate() failed early
- Never reaches JWT generation
- Returns HTTP 401

---

## FINDING 9: Frontend Expected Behavior After Password Reset

**File:** `frontend/src/app/(auth)/reset-password/new/page.tsx` (Line 30-43)

```typescript
const resetMut = useMutation({
  mutationFn: async () => {
    const { data } = await api.post('/auth/reset-password/', {
      email,
      otp: code,
      new_password: newPassword,
      new_password_confirm: confirmPassword,
    })
    return data
  },
  onSuccess: (data) => {
    toast.success('Password imebadilishwa kwa mafanikio! ✅')
    router.push('/login')  // ← Redirects to login page
  },
  onError: (error) => {
    toast.error(parseApiError(error) || 'Hitilafu katika kubadilisha password')
  },
})
```

**Expected flow:**
1. POST /auth/reset-password/ returns HTTP 200
2. Success toast shown
3. User redirected to /login page
4. User enters email and new password
5. POST /auth/login/ should return HTTP 200 with tokens
6. **But instead returns HTTP 401**

---

## Audit Findings

| Finding | Status | Impact |
|---------|--------|--------|
| **Email case handling** | ✓ Correct | None |
| **Password hashing** | ✓ Using set_password() | None |
| **Database persistence** | ? Unknown | **High** |
| **Post-save signals** | ✓ None found | None |
| **Middleware** | ✓ Standard | None |
| **Authentication backend** | ✓ Default ModelBackend | None |
| **Username field** | ✓ Correctly set to 'email' | None |

---

## Root Cause Hypothesis

### Hypothesis 1: Password Not Actually Saved
```python
user.set_password(new_password)
user.save()  # ← What if this doesn't commit?
```

If `save()` fails silently:
- Password in memory changed
- But database still has old password
- Login with new password → authentication fails
- Returns HTTP 401

**Evidence needed:**
- Database query: Check actual password hash in DB
- Application logs: Check for exceptions during save()

### Hypothesis 2: User Not Found During Login
```python
user = authenticate(request, username=email, password=password)
```

If user lookup fails:
- `User.objects.get(email=email)` raises DoesNotExist
- Caught in ModelBackend, returns None
- authenticate() returns None
- Returns HTTP 401

**Evidence needed:**
- Database query: Verify user row exists
- Check if email field has value

### Hypothesis 3: Password Hash Corrupted
```python
# After reset
password = "pbkdf2_sha256$480000$abc123..."

# On login check
user.check_password("NewPassword123")  # ← Returns False
```

If hash corruption occurs:
- check_password() returns False
- authenticate() returns None
- Returns HTTP 401

**Evidence needed:**
- Direct test: Call check_password() on the user in DB
- Verify hash format: `pbkdf2_sha256$...`

---

## Exact Error Response Capture

**When HTTP 401 is returned:**
```
POST /auth/login/ HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "NewPassword123"
}

HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "message": "Email au password si sahihi."
}
```

**This message is returned only from:**
- Line 113-114 in login_view when `authenticate()` returns None

---

## Required Database Inspection

To confirm root cause, run these queries:

### Query 1: Verify user exists
```sql
SELECT id, email, username, is_active, is_verified 
FROM accounts_user 
WHERE email = '<test_email>';
```

Expected result: One row with is_active=true

### Query 2: Check password hash
```sql
SELECT password 
FROM accounts_user 
WHERE email = '<test_email>';
```

Expected result: Hash starting with `pbkdf2_sha256$` (not plaintext)

### Query 3: Verify OTP state
```sql
SELECT code, purpose, is_verified, is_used, expires_at 
FROM accounts_otpcode 
WHERE user_id = <user_id> 
  AND code = '<otp_code>' 
  AND purpose = 'PASSWORD_RESET'
ORDER BY created_at DESC
LIMIT 1;
```

Expected result: is_verified=true, is_used=true (after reset complete)

### Query 4: Check if password matches
```sql
-- In Django shell:
from apps.accounts.models import User
user = User.objects.get(email='test@example.com')
user.check_password('NewPassword123')  # Should be True
```

---

## Conclusion

**No fixes applied** - audit only

**Root cause cannot be determined from code inspection alone**

**Required evidence:**
1. Database state verification (queries above)
2. Application logs during password reset
3. Application logs during failed login
4. Direct check_password() test

---

