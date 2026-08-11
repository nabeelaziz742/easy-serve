from rest_framework.permissions import BasePermission


class IsWaiter(BasePermission):
    """
    Allows access only to users with user_type == 'waiter'
    (managers/super_admins are also allowed to cover admin overrides).
    """
    message = "Only waiters can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.user_type in ("waiter", "manager", "super_admin")
        )


class IsChef(BasePermission):
    """
    Allows access only to users with user_type == 'chef'
    (managers/super_admins are also allowed to cover admin overrides).
    """
    message = "Only chefs can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.user_type in ("chef", "manager", "super_admin")
        )


class IsManager(BasePermission):
    """
    Allows access only to managers, restaurant owners, or super admins.
    """
    message = "Only managers can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.user_type in ("manager", "restaurant_owner", "super_admin")
        )