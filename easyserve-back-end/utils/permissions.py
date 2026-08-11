from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.user_type == "super_admin"
        )


class IsSuperAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        return (
            request.user.is_authenticated
            and request.user.user_type == "super_admin"
        )


class IsSuperAdminOrRestaurantOwner(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        return IsRestaurantOwner().has_object_permission(
            request,
            view,
            obj,
        )


class IsRestaurantOwner(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        return (
            user.is_authenticated
            and getattr(user, "user_type", None)
            in ["restaurant_owner", "manager"]
        )

    def has_object_permission(self, request, view, obj):
        user = request.user

        restaurant = self._find_restaurant(obj)

        if not restaurant:
            return False

        return (
            restaurant.owners.filter(
                user_id=user.id
            ).exists()
            or
            restaurant.waiters.filter(
                user_id=user.id
            ).exists()
        )

    def _find_restaurant(self, obj, visited=None):
        if visited is None:
            visited = set()

        if obj is None:
            return None

        if id(obj) in visited:
            return None

        visited.add(id(obj))

        if obj.__class__.__name__.lower() == "restaurant":
            return obj

        if hasattr(obj, "restaurant"):
            restaurant = getattr(
                obj,
                "restaurant",
                None,
            )

            if restaurant:
                return restaurant

        if not hasattr(obj, "_meta"):
            return None

        for field in obj._meta.get_fields():

            if not field.is_relation:
                continue

            try:
                related_obj = getattr(
                    obj,
                    field.name,
                )
            except Exception:
                continue

            if hasattr(related_obj, "all"):
                continue

            restaurant = self._find_restaurant(
                related_obj,
                visited,
            )

            if restaurant:
                return restaurant

        return None