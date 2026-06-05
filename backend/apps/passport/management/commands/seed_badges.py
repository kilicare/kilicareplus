from django.core.management.base import BaseCommand
from apps.passport.services import seed_badges


class Command(BaseCommand):
    help = 'Seed badges into the database'

    def handle(self, *args, **options):
        self.stdout.write('Seeding badges...')
        seed_badges()
        self.stdout.write(self.style.SUCCESS('Badges seeded successfully'))
