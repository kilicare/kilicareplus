# Generated migration to remove MomentComment model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('moments', '0003_moment_audio'),
    ]

    operations = [
        migrations.DeleteModel(
            name='MomentComment',
        ),
    ]
