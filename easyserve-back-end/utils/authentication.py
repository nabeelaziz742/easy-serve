"""JWT authentication that also locks out the staff of a disabled restaurant.

A super admin disables a restaurant when, for example, its subscription ends.
From then on its manager, waiters and chefs cannot log in, refresh a token or
keep using a token they already hold. Enabling the restaurant lets them back in.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication, default_user_authentication_rule
from rest_framework_simplejwt.exceptions import AuthenticationFailed

RESTAURANT_STAFF_TYPES = ("manager", "waiter", "chef")
RESTAURANT_DISABLED_MESSAGE = "This restaurant has been disabled. Please contact Easy Serve support."


def works_for_disabled_restaurant(user):
    from apps.userprofile.models import UserProfile

    return (
        getattr(user, "user_type", None) in RESTAURANT_STAFF_TYPES
        and UserProfile.objects.filter(user=user, restaurant__is_active=False).exists()
    )


def user_can_authenticate(user):
    """SIMPLE_JWT USER_AUTHENTICATION_RULE: used for login and token refresh."""
    return default_user_authentication_rule(user) and not works_for_disabled_restaurant(user)


class RestaurantJWTAuthentication(JWTAuthentication):
    """Rejects tokens issued before the user's restaurant was disabled."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if works_for_disabled_restaurant(user):
            raise AuthenticationFailed(RESTAURANT_DISABLED_MESSAGE, code="restaurant_disabled")
        return user
