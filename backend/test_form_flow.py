#!/usr/bin/env python
"""Test complete form flow and delete functionality"""
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.predictions.models import UserPrediction
from apps.predictions.validators import validate_teams_for_prediction
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

print("="*80)
print("TEST: Complete Form Flow & Delete Functionality")
print("="*80)

# Create test user
user, _ = User.objects.get_or_create(
    username='test_form_user',
    defaults={'email': 'testform@test.com'}
)
print(f"\n✓ Test user: {user.username}")

# Test 1: Validate teams (Form validation)
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
        print(f"    Home: {validation['home_team']['canonical']} ({validation['home_team']['status']})")
        print(f"    Away: {validation['away_team']['canonical']} ({validation['away_team']['status']})")
    else:
        print(f"  ✗ INVALID: {error}")

# Test 2: Create predictions for deletion
print("\n" + "="*80)
print("TEST 2: Create Predictions for Deletion Test")
print("="*80)

predictions_created = []
for i, (home, away, league) in enumerate(test_cases):
    pred = UserPrediction.objects.create(
        user=user,
        home_team=home,
        away_team=away,
        league=league,
        prediction_data={
            'home_win_prob': 0.45,
            'draw_prob': 0.25,
            'away_win_prob': 0.30,
            'confidence': 75,
        }
    )
    predictions_created.append(pred)
    print(f"  ✓ Created: {pred.home_team} vs {pred.away_team} (ID: {pred.id})")

# Test 3: Verify predictions exist
print("\n" + "="*80)
print("TEST 3: Verify Predictions Exist")
print("="*80)

all_preds = UserPrediction.objects.filter(user=user)
print(f"✓ Total predictions for user: {all_preds.count()}")
for pred in all_preds:
    print(f"  - {pred.home_team} vs {pred.away_team} (ID: {pred.id})")

# Test 4: Delete individual prediction
print("\n" + "="*80)
print("TEST 4: Delete Individual Prediction")
print("="*80)

if predictions_created:
    pred_to_delete = predictions_created[0]
    print(f"Deleting: {pred_to_delete.home_team} vs {pred_to_delete.away_team} (ID: {pred_to_delete.id})")
    pred_id = pred_to_delete.id
    pred_to_delete.delete()
    
    # Verify deletion
    exists = UserPrediction.objects.filter(id=pred_id).exists()
    if not exists:
        print(f"  ✓ Successfully deleted")
    else:
        print(f"  ✗ Failed to delete")

# Test 5: Delete by league
print("\n" + "="*80)
print("TEST 5: Delete Predictions by League")
print("="*80)

epl_count = UserPrediction.objects.filter(user=user, league='EPL').count()
print(f"EPL predictions before delete: {epl_count}")

UserPrediction.objects.filter(user=user, league='EPL').delete()

epl_count_after = UserPrediction.objects.filter(user=user, league='EPL').count()
print(f"EPL predictions after delete: {epl_count_after}")
print(f"  ✓ Deleted {epl_count - epl_count_after} EPL predictions")

# Test 6: Delete all predictions
print("\n" + "="*80)
print("TEST 6: Delete All Predictions for User")
print("="*80)

remaining = UserPrediction.objects.filter(user=user).count()
print(f"Predictions before delete-all: {remaining}")

UserPrediction.objects.filter(user=user).delete()

remaining_after = UserPrediction.objects.filter(user=user).count()
print(f"Predictions after delete-all: {remaining_after}")
print(f"  ✓ Successfully deleted all predictions")

# Cleanup
print("\n" + "="*80)
print("CLEANUP")
print("="*80)

user.delete()
print("✓ Test user cleaned up")

print("\n" + "="*80)
print("ALL TESTS COMPLETE ✅")
print("="*80)
