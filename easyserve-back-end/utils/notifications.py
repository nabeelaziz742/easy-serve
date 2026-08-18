from apps.userprofile.models import Notification


def create_notification(profile, message):
    """Create a notification when a user has a profile.

    Some system-level users, such as super admins, intentionally do not have
    a UserProfile. Notification creation must therefore be a no-op for those
    users instead of turning an otherwise successful request into HTTP 500.
    """
    if profile is None:
        return None

    return Notification.objects.create(profile=profile, message=message)
