from rest_framework.generics import ListAPIView
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q

from apps.inventory.models import StockMovementLog
from apps.inventory.serializers import StockMovementLogSerializer
from apps.inventory.permissions import HasInventoryAccess
from apps.inventory.services import StockService


class StockMovementLogListView(ListAPIView):
    serializer_class = StockMovementLogSerializer
    permission_classes = [HasInventoryAccess]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return StockMovementLog.objects.none()

        explicit_id = self.request.query_params.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            return StockMovementLog.objects.none()

        qs = (
            StockMovementLog.objects
            .filter(restaurant=restaurant)
            .select_related('inventory_item', 'inventory_item__uom', 'logged_by__user')
            .order_by('-created_at')
        )

        item_id = self.request.query_params.get('item_id')
        if item_id:
            qs = qs.filter(inventory_item_id=item_id)

        movement_type = self.request.query_params.get('movement_type')
        if movement_type:
            qs = qs.filter(movement_type=movement_type)

        start_date = self.request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(inventory_item__name__icontains=search) |
                Q(inventory_item__sku__icontains=search) |
                Q(reference_note__icontains=search)
            )

        return qs
