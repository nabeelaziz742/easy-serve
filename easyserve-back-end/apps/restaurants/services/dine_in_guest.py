"""Guest (no login) access for dine-in customers.

A customer who scans the table QR code orders and pays without an account.
The dine-in session token, handed out when the guest count is confirmed,
is what proves the browser belongs to that table: it is a random UUID that
only the people at the table ever see. Orders placed this way belong to one
inactive "guest" account per session, so the existing order, payment and
reporting code keeps working unchanged.
"""
import uuid

from apps.core.models import User
from apps.userprofile.models import UserProfile

DINE_IN_TOKEN_HEADER = "HTTP_X_DINE_IN_TOKEN"
GUEST_EMAIL_DOMAIN = "guest.easyserve.invalid"


def get_dine_in_token(request):
    """The table session token sent by the guest's browser, or None."""
    raw = request.META.get(DINE_IN_TOKEN_HEADER)
    if not raw:
        data = getattr(request, "data", None)
        raw = data.get("session_token") if hasattr(data, "get") else None
    if not raw:
        raw = request.query_params.get("session_token") if hasattr(request, "query_params") else None
    if not raw:
        return None
    try:
        return str(uuid.UUID(str(raw)))
    except (TypeError, ValueError):
        return None


def guest_owns_order(request, order):
    """True when the request carries the token of the order's table session."""
    token = get_dine_in_token(request)
    if not token or not order.dine_in_session_id:
        return False
    return str(order.dine_in_session.token) == token


def is_guest_profile(profile):
    return profile is not None and profile.user.email.endswith(f"@{GUEST_EMAIL_DOMAIN}")


def get_guest_profile(session):
    """The inactive guest account that owns this dine-in session's orders."""
    username = f"guest-{session.token}"
    user = User.objects.filter(username=username).first()
    if user is None:
        user = User(
            username=username,
            email=f"{username}@{GUEST_EMAIL_DOMAIN}",
            user_type="user",
            is_active=False,
        )
        user.set_unusable_password()
        user.save()

    profile = UserProfile.objects.filter(user=user).first()
    if profile is None:
        profile = UserProfile.objects.create(
            user=user,
            first_name=session.name or "Guest",
            last_name=f"Table {session.table.table_number}",
            phone=session.phone or None,
        )
    return profile


def checkout_customer(request, session):
    """A logged-in customer keeps their account; everyone else orders as the table's guest."""
    user = request.user
    if (
        user.is_authenticated
        and getattr(user, "user_type", None) == "user"
        and hasattr(user, "profile")
    ):
        return user.profile
    return get_guest_profile(session)