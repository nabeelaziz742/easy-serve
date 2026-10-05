from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.inventory.models import InventoryCategory
from apps.inventory.serializers import InventoryCategorySerializer
from apps.inventory.permissions import HasInventoryAccess
from apps.inventory.services import StockService


class InventoryCategoryViewSet(ModelViewSet):
    serializer_class = InventoryCategorySerializer
    permission_classes = [HasInventoryAccess]
    pagination_class = None

    def _get_target_restaurant(self):
        explicit_id = self.request.query_params.get('restaurant_id') or self.request.data.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(self.request.user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")
        return restaurant

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return InventoryCategory.objects.none()

        explicit_id = self.request.query_params.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            return InventoryCategory.objects.none()

        return InventoryCategory.objects.filter(restaurant=restaurant, is_active=True).order_by('name')

    def perform_create(self, serializer):
        restaurant = self._get_target_restaurant()
        serializer.save(restaurant=restaurant)

    def perform_destroy(self, instance):
        if instance.items.filter(is_active=True).exists():
            raise ValidationError("Cannot delete category with active inventory items. Reassign or delete items first.")
        instance.is_active = False
        instance.save(update_fields=['is_active'])
