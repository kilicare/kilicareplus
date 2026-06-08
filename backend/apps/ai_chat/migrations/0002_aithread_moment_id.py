# Generated migration to add moment_id to AIThread

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_chat', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='aithread',
            name='moment_id',
            field=models.IntegerField(blank=True, help_text='If set, this chat is tied to a specific moment', null=True),
        ),
    ]
