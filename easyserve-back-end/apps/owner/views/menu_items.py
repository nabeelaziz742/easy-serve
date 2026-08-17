from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet

from apps.restaurants.models import MenuItem
from apps.restaurants.serializers import MenuItemSerializer
from utils.permissions import IsRestaurantOwner


class MenuItemViewSet(ModelViewSet):
    queryset = MenuItem.objects.select_related("menu__restaurant").all()
    serializer_class = MenuItemSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsRestaurantOwner()]

    def _assert_menu_access(self, menu):
        user = self.request.user
        restaurant = menu.restaurant
        allowed = (
            restaurant.owners.filter(user_id=user.id).exists()
            or restaurant.waiters.filter(user_id=user.id).exists()
        )
        if not allowed:
            raise PermissionDenied("You do not have access to this restaurant's menu.")

    def get_queryset(self):
        queryset = super().get_queryset()
        menu_id = self.request.query_params.get("menu_id")

        if menu_id:
            queryset = queryset.filter(menu_id=menu_id)

        return queryset

    def perform_create(self, serializer):
        menu = serializer.validated_data.get("menu")
        self._assert_menu_access(menu)
        serializer.save()

    def perform_update(self, serializer):
        self._assert_menu_access(serializer.instance.menu)
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_menu_access(instance.menu)
        instance.delete()
