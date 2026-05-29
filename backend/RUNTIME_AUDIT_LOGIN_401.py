#!/usr/bin/env python
"""
FINAL RUNTIME AUDIT: HTTP 401 After Password Reset
Live database inspection + password hash verification
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import User, OTPCode

print("\n" + "=" * 100)
print("FINAL RUNTIME AUDIT: HTTP 401 After Password Reset")
print("=" * 100)

# TEST SETUP
test_email = "audit_test_user@example.com"
test_username = "audit_testuser"
old_password = "OldPassword123"
new_password = "NewPassword456"

print("\n" + "─" * 100)
print("STEP 1: Create Test User")
print("─" * 100)

# Delete if exists
User.objects.filter(email=test_email).delete()

# Create user
user = User.objects.create_user(
    username=test_username,
    email=test_email,
    password=old_password,
)
user.is_active = True
user.is_verified = True
user.save()

print(f"✓ Created user: {test_email}")
print(f"  - username: {test_username}")
print(f"  - is_active: {user.is_active}")
print(f"  - is_verified: {user.is_verified}")

# Query database immediately
from django.db import connection
cursor = connection.cursor()

cursor.execute(
    "SELECT email, password, is_active, is_verified FROM accounts_user WHERE email = %s",
    [test_email]
)
db_user_before = cursor.fetchone()
print(f"\n✓ Database state BEFORE password change:")
print(f"  - email: {db_user_before[0]}")
print(f"  - password hash: {db_user_before[1][:50]}...")
print(f"  - is_active: {db_user_before[2]}")
print(f"  - is_verified: {db_user_before[3]}")

# Test old password works
print(f"\n✓ Testing OLD password with check_password():")
check_old = user.check_password(old_password)
print(f"  check_password('{old_password}'): {check_old}")

auth_old = authenticate(username=test_email, password=old_password)
print(f"  authenticate(username='{test_email}', password='{old_password}'): {auth_old}")

# TEST PASSWORD RESET FLOW
print("\n" + "─" * 100)
print("STEP 2: Simulate Password Reset Flow")
print("─" * 100)

# Create OTP
otp_code = "123456"
otp = OTPCode.objects.create(
    user=user,
    code=otp_code,
    purpose='PASSWORD_RESET',
    expires_at=timezone.now() + timedelta(minutes=15),
    is_verified=False,
    is_used=False,
)
print(f"✓ Created OTP: {otp_code}")
print(f"  - is_verified: {otp.is_verified}")
print(f"  - is_used: {otp.is_used}")

# Simulate verify_otp_view for PASSWORD_RESET
print(f"\n✓ Simulating verify_otp_view (PURPOSE='PASSWORD_RESET'):")
otp.is_verified = True
otp.save()
print(f"  - Set is_verified = True")
print(f"  - Current OTP state: is_verified={otp.is_verified}, is_used={otp.is_used}")

# Simulate reset_password_view
print(f"\n✓ Simulating reset_password_view:")
print(f"  - Calling user.set_password('{new_password}')")

password_hash_before_set = user.password
user.set_password(new_password)
password_hash_after_set_before_save = user.password

print(f"  - Password hash changed in memory: {password_hash_before_set != password_hash_after_set_before_save}")
print(f"  - New hash (in memory): {password_hash_after_set_before_save[:50]}...")

print(f"\n  - Calling user.save()")
user.save()
print(f"  - save() completed")

# Query database IMMEDIATELY after save
print(f"\n✓ Database state IMMEDIATELY after save():")
cursor.execute(
    "SELECT email, password, is_active, is_verified FROM accounts_user WHERE email = %s",
    [test_email]
)
db_user_after_save = cursor.fetchone()
print(f"  - email: {db_user_after_save[0]}")
print(f"  - password hash: {db_user_after_save[1][:50]}...")
print(f"  - is_active: {db_user_after_save[2]}")
print(f"  - is_verified: {db_user_after_save[3]}")
print(f"  - Hash changed from BEFORE: {db_user_before[1] != db_user_after_save[1]}")

# Mark OTP as used (complete reset)
print(f"\n  - Marking OTP as used")
otp.is_used = True
otp.save()
print(f"  - OTP now: is_verified={otp.is_verified}, is_used={otp.is_used}")

# TEST: check_password() AFTER RESET
print("\n" + "─" * 100)
print("STEP 3: Check Password Verification AFTER Reset")
print("─" * 100)

# Refresh user from DB to ensure fresh state
user_fresh = User.objects.get(email=test_email)

print(f"✓ Loaded fresh user from DB: {user_fresh.email}")
print(f"  - Password hash: {user_fresh.password[:50]}...")
print(f"  - is_active: {user_fresh.is_active}")

print(f"\n✓ Testing check_password() with NEW password:")
check_new = user_fresh.check_password(new_password)
print(f"  check_password('{new_password}'): {check_new}")
print(f"  ✓ RESULT: {'✓ PASS' if check_new else '❌ FAIL'}")

print(f"\n✓ Testing check_password() with OLD password (should fail):")
check_old_after = user_fresh.check_password(old_password)
print(f"  check_password('{old_password}'): {check_old_after}")
print(f"  ✓ RESULT: {'✓ EXPECTED (False)' if not check_old_after else '❌ UNEXPECTED (True)'}")

# TEST: authenticate() AFTER RESET
print("\n" + "─" * 100)
print("STEP 4: Django authenticate() AFTER Reset")
print("─" * 100)

print(f"\n✓ Testing authenticate() with NEW password:")
auth_result = authenticate(username=test_email, password=new_password)
print(f"  authenticate(username='{test_email}', password='{new_password}')")
print(f"  Result: {auth_result}")
print(f"  ✓ RESULT: {'✓ PASS - User returned' if auth_result else '❌ FAIL - None returned'}")

if auth_result:
    print(f"    - Returned user: {auth_result.email}")
    print(f"    - User ID: {auth_result.id}")
    print(f"    - is_active: {auth_result.is_active}")
else:
    print(f"    - authenticate() returned None")
    print(f"    - This means EITHER:")
    print(f"      1. User lookup failed (email not found)")
    print(f"      2. Password check failed (check_password returned False)")

print(f"\n✓ Testing authenticate() with OLD password (should fail):")
auth_old_after = authenticate(username=test_email, password=old_password)
print(f"  authenticate(username='{test_email}', password='{old_password}')")
print(f"  Result: {auth_old_after}")
print(f"  ✓ RESULT: {'✓ EXPECTED (None)' if not auth_old_after else '❌ UNEXPECTED (User returned)'}")

# DIAGNOSTIC: Determine exact authenticate() failure reason
print("\n" + "─" * 100)
print("STEP 5: Diagnose Exact Failure Reason")
print("─" * 100)

print(f"\n✓ If authenticate() returned None, checking why...")

if auth_result is None:
    print(f"\n  Checking failure conditions:")
    
    # 1. User lookup
    try:
        lookup_user = User.objects.get(email=test_email)
        print(f"  1. ✓ User lookup: SUCCESS (user found)")
    except User.DoesNotExist:
        print(f"  1. ❌ User lookup: FAILED (user not found)")
        lookup_user = None
    
    # 2. User active
    if lookup_user:
        print(f"  2. {'✓' if lookup_user.is_active else '❌'} User is_active: {lookup_user.is_active}")
    
    # 3. Password check
    if lookup_user:
        pwd_check = lookup_user.check_password(new_password)
        print(f"  3. {'✓' if pwd_check else '❌'} check_password(new): {pwd_check}")
        
        if not pwd_check:
            print(f"\n     ❌ ROOT CAUSE FOUND: check_password() returns False")
            print(f"     Hash stored: {lookup_user.password[:50]}...")
            
            # Check hash format
            if lookup_user.password.startswith('pbkdf2_sha256$'):
                print(f"     Hash format: ✓ Valid PBKDF2 format")
            else:
                print(f"     Hash format: ❌ INVALID - starts with {lookup_user.password.split('$')[0]}")
            
            # Check for plaintext (would be ~8-30 chars)
            if len(lookup_user.password) < 50:
                print(f"     ❌ CRITICAL: Hash too short ({len(lookup_user.password)} chars) - likely PLAINTEXT!")
            else:
                print(f"     Hash length: ✓ {len(lookup_user.password)} chars (proper)")
else:
    print(f"\n  ✓ authenticate() succeeded - no failure to diagnose")

# COMPARE: Password sent vs stored
print("\n" + "─" * 100)
print("STEP 6: Compare Frontend vs Backend Passwords")
print("─" * 100)

print(f"\n✓ Frontend would send:")
print(f"  - Field name: 'password'")
print(f"  - Value: '{new_password}'")
print(f"  - Length: {len(new_password)} characters")

print(f"\n✓ Backend set_password() expects:")
print(f"  - String value (plaintext)")
print(f"  - Which it will hash and store")

print(f"\n✓ Actual stored in DB:")
print(f"  - Hash format: {user_fresh.password.split('$')[0]}$...")
print(f"  - Hash length: {len(user_fresh.password)} characters")
print(f"  - First 50 chars: {user_fresh.password[:50]}...")

# FINAL SUMMARY
print("\n" + "=" * 100)
print("FINAL AUDIT RESULTS")
print("=" * 100)

summary_pass = check_new and auth_result is not None

if summary_pass:
    print(f"\n✓ ALL TESTS PASSED")
    print(f"  ✓ Password hash changed in database")
    print(f"  ✓ check_password(new) returns True")
    print(f"  ✓ authenticate() returns user")
    print(f"  ✓ Password reset flow works correctly")
    print(f"\n❓ ROOT CAUSE OF 401 ERROR:")
    print(f"  Not reproducible in this test")
    print(f"  Possible causes:")
    print(f"  - Frontend sends different password than what user entered")
    print(f"  - Race condition between frontend password entry and submission")
    print(f"  - Frontend has cache of old password")
    print(f"  - Email case mismatch (frontend uses different case)")
    print(f"  - Multiple users with same email in database")
else:
    print(f"\n❌ TEST FAILED - ROOT CAUSE IDENTIFIED")
    
    if not check_new:
        print(f"\n  ❌ check_password(new) = False")
        print(f"     PASSWORD HASH NOT SAVED CORRECTLY OR CORRUPTED")
    
    if auth_result is None and check_new:
        print(f"\n  ❌ authenticate() = None but check_password() = True")
        print(f"     AUTHENTICATION BACKEND ISSUE")
    
    if auth_result is None and not check_new:
        print(f"\n  ❌ authenticate() = None AND check_password() = False")
        print(f"     PASSWORD NOT SAVED TO DATABASE CORRECTLY")

# Cleanup
print("\n" + "─" * 100)
print("CLEANUP")
print("─" * 100)

User.objects.filter(email=test_email).delete()
OTPCode.objects.filter(user__email=test_email).delete()
print(f"\n✓ Test user deleted")

print("\n" + "=" * 100)
print("END OF AUDIT")
print("=" * 100 + "\n")
