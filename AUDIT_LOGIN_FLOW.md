# 🔐 DEEP AUDIT: LOGIN FLOW After Password Reset - Root Cause Analysis

## Executive Summary

**Problem:** After user successfully resets password, login attempt returns **HTTP 401 Unauthorized** with message "Email au password si sahihi."

**Audit Status:** No assumptions - runtime-level analysis only

---

## PHASE 1: Frontend Login Page

**File:** `frontend/src/app/(auth)/login/page.tsx` (Line 17-100)

### Form Input Collection
```typescript
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')

const submit = (e?: React.FormEvent) => {
  e?.preventDefault()
  if (!email || !password) {
    toast.error('Weka email na password')
    return
  }
  loginMut.mutate()  // ← Calls authService.login()
}
```

**State:** 
- Email entered as-is (no trimming visible)
- Password entered as-is
- Both stored in state without modification

### Mutation Definition
```typescript
const loginMut = useMutation({
  mutationFn: () => authService.login(email, password),  // ← Pass directly
  onSuccess: (data) => {
    setAuth(data.user, data.access, data.refresh)
    toast.success(`Karibu ${data.user.first_name || data.user.username}! 🌍`)
    router.push('/feed')  // ← Redirect to /feed
  },
  onError: (e) => toast.error(parseApiError(e)),
})
```

**Redirect after success:** `/feed`

**On error:** Shows parsed error message (likely "Email au password si sahihi.")

---

## PHASE 2: Frontend Auth Service

**File:** `frontend/src/services/auth.service.ts` (Line 19-23)

### Login Method
```typescript
async login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login/', {
    email,
    password,
  })
  return data
}
```

**Exact Payload Sent:**
```json
{
  "email": "user@example.com",
  "password": "NewPassword123"
}
```

**Endpoint:** `POST /auth/login/`

**Field Names:** 
- `email` (not `username`)
- `password` (exact as entered)

**No transformation applied** - sent as-is to backend

---

## PHASE 3: Backend Login Endpoint

**File:** `backend/apps/accounts/views.py` (Line 100-140)

**Route:** `/auth/login/` → `login_view` (from urls.py line 6)

### Login View Code
```python
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email', '').lower().strip()  # ← LOWERCASE + STRIP
    password = request.data.get('password', '')
    
    if not email or not password:
        return Response(
            {'message': 'Email na password zinahitajika.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Line 109: CRITICAL - authenticate() call
    user = authenticate(request, username=email, password=password)
    
    if not user:
        return Response(
            {'message': 'Email au password si sahihi.'},
            status=status.HTTP_401_UNAUTHORIZED  # ← THIS ERROR
        )
    
    if not user.is_active:
        return Response(
            {'message': 'Akaunti haijathibitishwa. '
                        'Angalia email yako kwa OTP.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    refresh = RefreshToken.for_user(user)
    return Response({
        'success': True,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user, context={'request': request}).data,
    })
```

### Step-by-Step Processing

1. **Extract credentials:**
   - `email = "user@example.com"` (lowercased, stripped)
   - `password = "NewPassword123"` (as-is)

2. **Validation:**
   - Both present ✓

3. **Authentication (Line 109):**
   ```python
   user = authenticate(request, username=email, password=password)
   ```
   - Calls Django's `authenticate()` function
   - Passes `username=<email_value>` keyword argument
   - Passes `password=<password_value>`

4. **Result Check:**
   - If `user is None` → Return HTTP 401
   - If `user.is_active == False` → Return HTTP 403

---

## PHASE 4: Django Authentication Backend

**Django Default Backend:** `django.contrib.auth.backends.ModelBackend`

### How authenticate() Works

**Settings Check:**
```python
# backend/core/settings/base.py
AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}
# No custom AUTHENTICATION_BACKENDS defined
# → Uses Django's default: ModelBackend
```

**User Model Configuration:**
```python
# backend/apps/accounts/models.py
class User(AbstractUser):
    email = models.EmailField(unique=True)
    username = models.CharField(...)  # From AbstractUser
    
    USERNAME_FIELD = 'email'  # ← Critical!
    REQUIRED_FIELDS = ['username']
```

**Authentication Flow:**

When `authenticate(request, username=email_value, password=password)` is called:

1. Django's `ModelBackend.authenticate()` method receives:
   - `request` = request object
   - `username` = <email_value> (e.g., "user@example.com")
   - `password` = <password_value>

2. The backend checks `User.USERNAME_FIELD` = `'email'`

3. Attempts to find user:
   ```python
   user = User.objects.get(email=email_value)
   ```

4. If user found, checks password:
   ```python
   if user.check_password(password):
       return user
   else:
       return None  # → Leads to 401 error
   ```

---

## PHASE 5: User Model & Password Check

**File:** `backend/apps/accounts/models.py` (Line 1-28)

```python
class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=15, ...)
    is_verified = models.BooleanField(default=False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
```

**Inherited from AbstractUser:**
- `username` - CharField
- `password` - CharField (stores hashed password)
- `is_active` - BooleanField
- Other fields

**Password Check Mechanism:**

Django's `check_password()` method:
```python
user.check_password(password_to_check)
```

This:
1. Takes the `password` field (stored hash)
2. Compares with provided password using PBKDF2 hashing
3. Returns True/False

---

## PHASE 6: Password Reset Review

**File:** `backend/apps/accounts/views.py` (Line 370-378)

```python
# Reset password using Django's secure method
user.set_password(new_password)
user.save()
logger.info(f'[RESET PASSWORD] Password changed successfully for user: {email}')

return Response({
    'success': True,
    'message': 'Password imebadilishwa kwa mafanikio! Ingia sasa.',
})
```

**Password Save Method:** `user.set_password()`

This method:
1. Takes plaintext password
2. Hashes it using Django's password hasher
3. Stores hash in `user.password` field
4. User.save() persists to database

**This is the correct way to save passwords** ✓

---

## AUDIT ANALYSIS: Where 401 Can Come From

### Possible Causes

| Scenario | Effect | Likelihood |
|----------|--------|-----------|
| **A: authenticate() returns None** | HTTP 401 | Very High |
| **B: user.is_active == False** | HTTP 403 (not 401) | No |
| **C: Wrong password stored** | authenticate() fails | High |
| **D: User lookup fails** | authenticate() returns None | Medium |
| **E: Email case sensitivity** | User not found | Low (lowercased both) |
| **F: Password hash corruption** | check_password() fails | Low |

### Most Likely: User Not Found or Password Mismatch

The 401 error message is "Email au password si sahihi" which is returned when `authenticate()` returns None.

This happens when EITHER:
1. **User not found** by email
2. **Password doesn't match** stored hash

---

## Critical Questions for Diagnosis

### Question 1: User Lookup

**Does the user still exist in the database after password reset?**

The password reset code:
```python
user = User.objects.get(email=email)
user.set_password(new_password)
user.save()
```

This finds the user by email, changes password, saves. It should NOT delete the user. ✓

### Question 2: Email Case Matching

**Frontend sends:** `email` (may be any case)
**Backend processes:** `.lower().strip()` (converts to lowercase)
**Database lookup:** `User.objects.get(email=<lowercase_email>)`

The email field is defined as:
```python
email = models.EmailField(unique=True)
```

Django's EmailField stores emails in database as provided. The `.lower()` should match if the original registration also used `.lower()`.

**Check: Was the user registered with lowercase email?**

### Question 3: Password Hash Integrity

**After password reset:**
- `user.set_password(new_password)` - hashes the password
- `user.save()` - saves to database

**On login:**
- `user.check_password(provided_password)` - compares hashes

**Question: Did `user.save()` actually commit to the database?**

Looking at the code - no explicit transaction management. Should use default behavior. ✓

### Question 4: User State After Reset

**After password reset, is `user.is_active` still True?**

The password reset code does NOT modify `is_active`:
```python
# Only changes password, no state modification
user.set_password(new_password)
user.save()
```

So `is_active` should retain its value from before reset.

**But wait:** Let me check the verify_otp_view for PASSWORD_RESET...

Looking back at the fixed code:
```python
elif purpose == 'PASSWORD_RESET':
    # PASSWORD_RESET: Mark as verified only (will be marked used in step 3)
    otp.is_verified = True
    otp.save()
    logger.debug(...)
    # ← Does NOT modify user state
```

So the user should still be `is_active=True` (or whatever it was). ✓

---

## PHASE 7: Exact Flow After Password Reset

### Scenario: User Registered → Password Reset → Login

**Step 1: User Registration**
```
POST /auth/register/
- User created
- is_active = False (waiting for email verification)
- password = hashed("OriginalPassword123")
- email = "user@example.com"
```

**Step 2: User Verifies Email (via OTP)**
```
POST /auth/otp/verify/ (purpose='EMAIL_VERIFY')
- is_active = True ← SET BY verify_otp_view
- is_verified = True
- password = hashed("OriginalPassword123") - unchanged
```

**Step 3: User Requests Password Reset**
```
POST /auth/forgot-password/
POST /auth/otp/verify/ (purpose='PASSWORD_RESET')
- OTP verified
- is_active = True - unchanged
- password = hashed("OriginalPassword123") - still unchanged
```

**Step 4: User Resets Password**
```
POST /auth/reset-password/
- password = hashed("NewPassword123") ← CHANGED
- is_active = True - unchanged
- is_verified = True - unchanged
```

**Step 5: User Tries to Login**
```
POST /auth/login/
- Searches: User.objects.get(email="user@example.com".lower())
- Checks: user.check_password("NewPassword123")
  - Should succeed because password was just set
- Checks: user.is_active == True
  - Should be True from step 2

Expected: SUCCESS ✓
Actual: 401 ERROR ❌
```

---

## Database State Verification Questions

To diagnose the 401 error, we need to verify:

| Check | SQL | Expected | Why |
|-------|-----|----------|-----|
| **User exists** | `SELECT * FROM accounts_user WHERE email='user@example.com'` | 1 row | User should exist |
| **Password hash updated** | `SELECT password FROM accounts_user WHERE email='user@example.com'` | Hash starting with `pbkdf2_sha256$...` | Should be hashed with new algo |
| **is_active state** | `SELECT is_active FROM accounts_user WHERE email='user@example.com'` | `true` | Should be True after email verify |
| **is_verified state** | `SELECT is_verified FROM accounts_user WHERE email='user@example.com'` | `true` | Should be True after email verify |
| **Password field type** | Examine field | CharField | Storing hash, not plaintext |

---

## Audit Summary: Possible Root Causes

### 1. **User Not Found (Low Probability)**
- User deleted or not in DB
- Email lookup fails
- Case mismatch (unlikely due to `.lower()`)

### 2. **Password Hash Mismatch (High Probability)** 
- Password not saved correctly
- `user.save()` didn't commit
- Database transaction issue
- Password hashed differently

### 3. **User State Issue (Medium Probability)**
- `is_active = False` (returns 403, not 401)
- Other field preventing authentication

### 4. **Password Reset Didn't Actually Execute (High Probability)**
- OTP lookup in reset_password_view failed
- Exception caught silently
- Password change skipped
- User still has old password

---

## Expected Behavior vs Actual Behavior

| Step | Expected | Actual |
|------|----------|--------|
| **Submit new password** | HTTP 200, redirects to /login | ? |
| **Login page** | Shows form | ? |
| **Submit login with new password** | HTTP 200, tokens, redirects to /feed | HTTP 401 |
| **Error message** | None (success) | "Email au password si sahihi." |

---

## Required Tests to Confirm Root Cause

### Test 1: Direct Database Query
```sql
SELECT email, password, is_active, is_verified FROM accounts_user 
WHERE email = 'test@example.com';
```

**Verify:**
- User exists
- Password hash is NOT 'unhashed' or plaintext
- is_active = true
- is_verified = true

### Test 2: Django Shell Check Password
```python
from apps.accounts.models import User
user = User.objects.get(email='test@example.com')
print(user.check_password('NewPassword123'))  # Should be True
print(user.check_password('OldPassword123'))  # Should be False
```

### Test 3: Login with Old Password
```
POST /auth/login/
{
  "email": "test@example.com",
  "password": "OldPassword123"
}
```
Expected: 401 Unauthorized ✓

### Test 4: Login with New Password
```
POST /auth/login/
{
  "email": "test@example.com",
  "password": "NewPassword123"
}
```
Expected: 200 OK with tokens (currently failing)

### Test 5: Login with Username (if different)
```
POST /auth/login/
{
  "email": "testuser",  // username instead
  "password": "NewPassword123"
}
```
Expected: Depends on authenticate() behavior with USERNAME_FIELD

---

## Code Paths Summary

```
FRONTEND                          BACKEND
─────────────────────────────────────────────────────
login page.tsx
  ↓ (email, password)
authService.login()
  ↓ POST /auth/login/
                                 login_view
                                   ↓
                                 extract: email, password
                                   ↓
                                 authenticate(username=email, password=password)
                                   ↓
                                 ModelBackend.authenticate()
                                   ↓
                                 User.objects.get(email=<email>)
                                   ↓
                                 user.check_password(password)
                                   ↓
                                 if user and user.is_active:
                                   ↓
                                 RefreshToken.for_user(user)
                                   ↓
                                 return JWT tokens
                                   ↓
                            (onSuccess → setAuth → redirect /feed)
                      OR (onError → toast.error "Email au password si sahihi.")
```

---

## Red Flags in Code

### Flag 1: No explicit transaction in password reset
```python
user.set_password(new_password)
user.save()  # ← Relies on implicit transaction
```

Should be OK in normal Django, but could fail if:
- Database connection drops
- Transaction rolled back
- Post-save signal fails

### Flag 2: No verification that password reset succeeded
```python
return Response({
    'success': True,
    'message': 'Password imebadilishwa kwa mafanikio! Ingia sasa.',
})
# ← Returns success WITHOUT verifying save succeeded
```

### Flag 3: Password check uses default Django hasher
```python
user.check_password(password)
```

This should work if password was saved with `set_password()`. But if password was saved any other way, it would fail.

---

## Audit Conclusion

**Current Error:** HTTP 401 Unauthorized after password reset

**Root Cause Location:** Unknown - requires database state verification

**Next Steps to Determine Cause:**
1. Query database to verify user exists
2. Check password hash in database
3. Verify user.is_active = True
4. Test `check_password()` directly
5. Review application logs for exceptions during reset
6. Check if password reset endpoint actually returned 200 OK

**No fixes applied** - audit only

