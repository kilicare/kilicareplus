# Generated migration to remove COMMENT content type from Report model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('moderation', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='report',
            name='content_type',
            field=models.CharField(
                choices=[('MOMENT', 'Moment'), ('TIP', 'Tip'), ('EXPERIENCE', 'Experience'), ('USER', 'User'), ('MESSAGE', 'Message')],
                max_length=20
            ),
        ),
    ]
