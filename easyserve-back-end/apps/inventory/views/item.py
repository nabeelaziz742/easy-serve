from decimal import Decimal
from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q, F

from apps.inventory.models import InventoryItem
from apps.inventory.serializers import InventoryItemSerializer, InventoryItemDetailSerializer
from apps.inventory.permissions import HasInventoryAccess
from apps.inventory.services import StockService


class InventoryItemViewSet(ModelViewSet):
    permission_classes = [HasInventoryAccess]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return InventoryItemDetailSerializer
        return InventoryItemSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        restaurant = StockService.resolve_user_restaurant(
            self.request.user,
            self.request.query_params.get('restaurant_id') or self.request.data.get('restaurant_id')
        )
        ctx['restaurant'] = restaurant
        return ctx

    def _get_target_restaurant(self):
        explicit_id = self.request.query_params.get('restaurant_id') or self.request.data.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(self.request.user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")
        return restaurant

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return InventoryItem.objects.none()

        explicit_id = self.request.query_params.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            return InventoryItem.objects.none()

        qs = InventoryItem.objects.filter(
            restaurant=restaurant,
            is_active=True
        ).select_related('category', 'uom').order_by('name')

        # Filters
        category_id = self.request.query_params.get('category_id')
        if category_id:
            qs = qs.filter(category_id=category_id)

        status_filter = self.request.query_params.get('status')
        if status_filter == 'low_stock':
            qs = qs.filter(current_stock__gt=Decimal('0'), current_stock__lte=F('min_reorder_level'))
        elif status_filter == 'out_of_stock':
            qs = qs.filter(current_stock__lte=Decimal('0'))
        elif status_filter == 'in_stock':
            qs = qs.filter(current_stock__gt=F('min_reorder_level'))

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(sku__icontains=search))

        return qs

    def perform_create(self, serializer):
        restaurant = self._get_target_restaurant()
        user_profile = getattr(self.request.user, 'profile', None)

        validated_data = dict(serializer.validated_data)
        validated_data['restaurant'] = restaurant

        item = StockService.create_item_with_opening_stock(
            validated_data=validated_data,
            user_profile=user_profile
        )
        serializer.instance = item

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])
