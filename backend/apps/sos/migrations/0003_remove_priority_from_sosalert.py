# Generated manually to remove priority field

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('sos', '0002_alter_sosresponse_options_sosalert_admin_override_at_and_more'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='sosalert',
            name='sos_sosaler_priorit_5661c1_idx',
        ),
        migrations.RemoveField(
            model_name='sosalert',
            name='priority',
        ),
    ]
