from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet

from apps.restaurants.models import MenuItemIngredient
from apps.restaurants.serializers import MenuItemIngredientSerializer
from utils.notifications import create_notification
from utils.permissions import IsRestaurantOwner


class MenuItemIngredientViewSet(ModelViewSet):
    queryset = MenuItemIngredient.objects.all()
    serializer_class = MenuItemIngredientSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsRestaurantOwner()]

    def get_queryset(self):
        menu_item_id = self.request.query_params.get('menu_item_id')
        if menu_item_id:
            return MenuItemIngredient.objects.filter(menu_item_id=menu_item_id)
        return MenuItemIngredient.objects.none()

    def _assert_menu_item_access(self, menu_item):
        # Same ownership pattern used by MenuViewSet/MenuItemViewSet
        # (via menu_item.menu.restaurant). The role-only IsRestaurantOwner
        # permission does not verify which restaurant's menu the requester
        # may touch, so without this check any owner/manager account could
        # attach ingredients to another restaurant's menu items.
        user = self.request.user
        if not user.is_authenticated or menu_item is None:
            raise PermissionDenied("You do not have access to this menu item.")

        restaurant = menu_item.menu.restaurant
        allowed = (
            restaurant.owners.filter(user_id=user.id).exists()
            or restaurant.waiters.filter(user_id=user.id).exists()
        )
        if not allowed:
            raise PermissionDenied("You do not have access to this menu item.")

    def perform_create(self, serializer):
        menu_item = serializer.validated_data.get("menu_item")
        self._assert_menu_item_access(menu_item)

        instance = serializer.save()
        create_notification(
            profile=self.request.user.profile,
            message=f"New ingredient '{instance.name}' created for menu item '{instance.menu_item.name}'."
        )

    def perform_update(self, serializer):
        self._assert_menu_item_access(serializer.instance.menu_item)
        instance = serializer.save()
        create_notification(
            profile=self.request.user.profile,
            message=f"Ingredient '{instance.name}' updated for menu item '{instance.menu_item.name}'."
        )

    def perform_destroy(self, instance):
        self._assert_menu_item_access(instance.menu_item)
        ingredient_name = instance.name
        menu_item_name = instance.menu_item.name
        instance.delete()
        create_notification(
            profile=self.request.user.profile,
            message=f"Ingredient '{ingredient_name}' deleted from menu item '{menu_item_name}'."
        )
