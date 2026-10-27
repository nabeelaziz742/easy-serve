from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from apps.restaurants.models import Table
from apps.restaurants.serializers import TableSerializer


class TableViewSet(viewsets.ModelViewSet):
    """
    Tables are scoped to the requester's restaurant. Previously any logged-in
    account (customers included) could list, rename, create and delete every
    restaurant's tables; deleting one also cascaded its dine-in sessions.
    Staff of a restaurant may read its tables; only its owner/manager (or a
    super admin) may change them.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TableSerializer

    STAFF_READ_TYPES = ("waiter", "chef", "manager", "restaurant_owner")
    STAFF_WRITE_TYPES = ("manager", "restaurant_owner")

    def _restaurant_ids(self):
        user = self.request.user
        profile = getattr(user, "profile", None)
        if profile is None:
            return []
        ids = set(profile.owned_restaurants.values_list("id", flat=True))
        if profile.restaurant_id:
            ids.add(profile.restaurant_id)
        return ids

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or getattr(user, "user_type", None) == "super_admin":
            return Table.objects.all()
        if getattr(user, "user_type", None) not in self.STAFF_READ_TYPES:
            return Table.objects.none()
        return Table.objects.filter(restaurant_id__in=self._restaurant_ids())

    def _assert_can_write(self, restaurant):
        user = self.request.user
        if user.is_superuser or getattr(user, "user_type", None) == "super_admin":
            return
        if (
            getattr(user, "user_type", None) not in self.STAFF_WRITE_TYPES
            or restaurant is None
            or restaurant.id not in self._restaurant_ids()
        ):
            raise PermissionDenied("You cannot manage this restaurant's tables.")

    def perform_create(self, serializer):
        self._assert_can_write(serializer.validated_data.get("restaurant"))
        serializer.save()

    def perform_update(self, serializer):
        self._assert_can_write(serializer.instance.restaurant)
        new_restaurant = serializer.validated_data.get("restaurant")
        if new_restaurant is not None:
            self._assert_can_write(new_restaurant)
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_can_write(instance.restaurant)
        instance.delete()
