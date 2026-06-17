# Generated migration for chat_room field

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0001_initial'),
        ('sos', '0003_remove_priority_from_sosalert'),
    ]

    operations = [
        migrations.AddField(
            model_name='sosalert',
            name='chat_room',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='sos_alerts',
                to='messaging.chatroom',
                db_constraint=False,  # Defer constraint to avoid circular dependency issues
                help_text='Chat room for ongoing conversation between tourist and guide'
            ),
        ),
    ]
