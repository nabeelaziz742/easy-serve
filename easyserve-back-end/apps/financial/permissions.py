from rest_framework.permissions import BasePermission
from apps.restaurants.models import Restaurant


class HasFinancialAccess(BasePermission):
    """
    Grants access exclusively to Managers, Restaurant Owners, and Super Admins.
    Strictly denies Chefs, Waiters, Customers, and unauthenticated users.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        user_type = getattr(user, 'user_type', None)

        if user_type == 'super_admin':
            return True

        if user_type in ['restaurant_owner', 'manager']:
            return True

        return False


def get_request_restaurant(request):
    """
    Resolves the target restaurant for the current user request.
    Enforces multi-tenant isolation.
    """
    user = request.user
    if not user or not user.is_authenticated:
        return None

    user_type = getattr(user, 'user_type', None)
    profile = getattr(user, 'profile', None)
    if not profile:
        return None

    # Optional query param for restaurant_id (if multi-restaurant owner or super admin)
    restaurant_id_param = request.query_params.get('restaurant_id')
    if restaurant_id_param:
        try:
            r_id = int(restaurant_id_param)
            if user_type == 'super_admin':
                return Restaurant.objects.filter(id=r_id).first()
            if user_type == 'restaurant_owner' and profile.owned_restaurants.filter(id=r_id).exists():
                return Restaurant.objects.filter(id=r_id).first()
            if user_type == 'manager' and (profile.restaurant_id == r_id or profile.selected_restaurant == r_id):
                return Restaurant.objects.filter(id=r_id).first()
        except (ValueError, TypeError):
            pass

    # Manager / Owner default assignment
    if profile.restaurant:
        return profile.restaurant
    if hasattr(profile, 'selected_restaurant') and profile.selected_restaurant:
        r = Restaurant.objects.filter(id=profile.selected_restaurant).first()
        if r:
            return r
    if profile.owned_restaurants.exists():
        return profile.owned_restaurants.first()

    return None
