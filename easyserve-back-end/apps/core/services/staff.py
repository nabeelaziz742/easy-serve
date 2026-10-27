from django.contrib.auth import get_user_model

from apps.userprofile.models import UserProfile

User = get_user_model()


def create_staff_member(restaurant, *, username, email, password, user_type,
                        first_name="", last_name="", phone=""):
    """An active staff login with its profile linked to `restaurant`.

    Staff accounts are created by a manager or super admin, so they skip
    the email activation that customers go through.
    """
    user = User.objects.create_user(
        email=email,
        username=username,
        password=password,
        user_type=user_type,
        is_active=True,
    )
    UserProfile.objects.update_or_create(
        user=user,
        defaults={
            "restaurant": restaurant,
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
        },
    )
    return user
