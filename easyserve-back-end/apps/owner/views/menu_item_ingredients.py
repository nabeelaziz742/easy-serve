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

    def perform_create(self, serializer):
        instance = serializer.save()
        create_notification(
            profile=self.request.user.profile,
            message=f"New ingredient '{instance.name}' created for menu item '{instance.menu_item.name}'."
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        create_notification(
            profile=self.request.user.profile,
            message=f"Ingredient '{instance.name}' updated for menu item '{instance.menu_item.name}'."
        )

    def perform_destroy(self, instance):
        ingredient_name = instance.name
        menu_item_name = instance.menu_item.name
        instance.delete()
        create_notification(
            profile=self.request.user.profile,
            message=f"Ingredient '{ingredient_name}' deleted from menu item '{menu_item_name}'."
        )
