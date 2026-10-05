from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db.models import Q

from apps.inventory.models import UnitOfMeasure
from apps.inventory.serializers import UnitOfMeasureSerializer
from apps.inventory.permissions import HasInventoryAccess
from apps.inventory.services import StockService


class UnitOfMeasureViewSet(ModelViewSet):
    serializer_class = UnitOfMeasureSerializer
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
            return UnitOfMeasure.objects.none()

        explicit_id = self.request.query_params.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            return UnitOfMeasure.objects.filter(restaurant__isnull=True, is_active=True)

        return UnitOfMeasure.objects.filter(
            Q(restaurant=restaurant) | Q(restaurant__isnull=True),
            is_active=True
        ).order_by('name')

    def perform_create(self, serializer):
        restaurant = self._get_target_restaurant()
        serializer.save(restaurant=restaurant)

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.restaurant is None and self.request.user.user_type != 'super_admin':
            raise ValidationError("Cannot modify system-default units of measure.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.restaurant is None and self.request.user.user_type != 'super_admin':
            raise ValidationError("Cannot delete system-default units of measure.")
        if instance.inventory_items.exists():
            raise ValidationError("Cannot delete unit of measure because active inventory items are linked to it.")
        instance.is_active = False
        instance.save(update_fields=['is_active'])
