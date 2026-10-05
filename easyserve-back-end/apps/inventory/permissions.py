from rest_framework.permissions import BasePermission, SAFE_METHODS


class HasInventoryAccess(BasePermission):
    """
    Grants read-only access to chefs, managers, owners, super_admins.
    Grants write/manage access to managers, owners, and super_admins.
    Denies waiters and regular customers completely.
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

        # Chef can only view (read-only)
        if user_type == 'chef' and request.method in SAFE_METHODS:
            return True

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        user_type = getattr(user, 'user_type', None)
        if user_type == 'super_admin':
            return True

        # Resolve restaurant of the target object
        restaurant = getattr(obj, 'restaurant', None)
        if not restaurant:
            return False

        profile = getattr(user, 'profile', None)
        if not profile:
            return False

        if user_type == 'restaurant_owner':
            return profile.owned_restaurants.filter(id=restaurant.id).exists()

        if user_type in ['manager', 'chef']:
            return (
                profile.restaurant_id == restaurant.id or
                profile.selected_restaurant == restaurant.id or
                profile.owned_restaurants.filter(id=restaurant.id).exists()
            )

        return False
