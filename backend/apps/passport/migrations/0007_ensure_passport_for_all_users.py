from django.db import migrations

def ensure_passport_profiles(apps, schema_editor):
    """
    Data migration to ensure all existing users have a PassportProfile.
    This fixes the login 500 error caused by missing passport profiles for legacy users.
    """
    User = apps.get_model('accounts', 'User')
    PassportProfile = apps.get_model('passport', 'PassportProfile')
    
    users_without_passport = []
    for user in User.objects.all():
        if not hasattr(user, 'passport'):
            PassportProfile.objects.create(user=user)
            users_without_passport.append(user.email)
    
    if users_without_passport:
        print(f"Created passport profiles for {len(users_without_passport)} users: {users_without_passport}")

class Migration(migrations.Migration):
    dependencies = [
        ('passport', '0006_alter_passportprofile_qr_code'),
        ('accounts', '0001_initial'),
    ]
    
    operations = [
        migrations.RunPython(ensure_passport_profiles),
    ]
