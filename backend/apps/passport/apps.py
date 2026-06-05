from django.apps import AppConfig


class PassportConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.passport'

    def ready(self):
        # Removed seed_badges() call to prevent database access during app initialization
        # This was causing RuntimeWarning and intermittent "relation does not exist" errors
        # Badge seeding should be done via management command or migration
        pass
