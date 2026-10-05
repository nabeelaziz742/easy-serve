from rest_framework.permissions import BasePermission


class HasExpenseAccess(BasePermission):
    """
    Grants access exclusively to Managers, Restaurant Owners, and Super Admins.
    Strictly denies Chefs, Waiters, and unauthenticated/customer users.
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

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        user_type = getattr(user, 'user_type', None)
        if user_type == 'super_admin':
            return True

        restaurant = getattr(obj, 'restaurant', None)
        if not restaurant:
            return False

        profile = getattr(user, 'profile', None)
        if not profile:
            return False

        if user_type == 'restaurant_owner':
            return profile.owned_restaurants.filter(id=restaurant.id).exists()

        if user_type == 'manager':
            return (
                profile.restaurant_id == restaurant.id or
                profile.selected_restaurant == restaurant.id or
                profile.owned_restaurants.filter(id=restaurant.id).exists()
            )

        return False
