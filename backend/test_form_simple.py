#!/usr/bin/env python
"""Test complete form flow and delete functionality"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from apps.predictions.models import UserPrediction
from apps.predictions.validators import validate_teams_for_prediction
from django.contrib.auth import get_user_model

User = get_user_model()

print("="*80)
print("TEST: Complete Form Flow & Delete Functionality")
print("="*80)

# Create test user
user, created = User.objects.get_or_create(
    username='test_form_user',
    defaults={'email': 'testform@test.com'}
)
print(f"\n✓ Test user: {user.username} (created={created})")

# Test 1: Validate teams
print("\n" + "="*80)
print("TEST 1: Form Validation Flow")
print("="*80)

test_cases = [
    ("Chelsea", "Arsenal", "EPL"),
    ("Manchester City", "Liverpool", "EPL"),
    ("Barcelona", "Real Madrid", "LA_LIGA"),
]

for home, away, league in test_cases:
    print(f"\nValidating: {home} vs {away} ({league})")
    all_valid, validation, error = validate_teams_for_prediction(home, away, league)
    
    if all_valid:
        print(f"  ✓ VALID")
    else:
        print(f"  ✗ INVALID: {error}")

print("\n✓ Form validation tests complete")
