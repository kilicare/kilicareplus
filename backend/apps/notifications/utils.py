def create_notification(
    recipient, notification_type, title, body,
    data=None, sender=None
):
    print(f'[NOTIF] → {recipient.email}: {title}')