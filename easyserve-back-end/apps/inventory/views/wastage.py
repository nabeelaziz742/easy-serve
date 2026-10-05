from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.models import StockWastage
from apps.inventory.permissions import HasInventoryAccess
from apps.inventory.serializers import (
    StockWastageSerializer,
    StockWastageCreateSerializer,
)
from apps.inventory.services import StockService, WastageService


class StockWastageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing, filtering, and retrieving StockWastage records.
    Also provides a POST endpoint for recording new wastage events and a summary action.
    """
    serializer_class = StockWastageSerializer
    permission_classes = [HasInventoryAccess]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return StockWastage.objects.none()

        explicit_id = self.request.query_params.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            return StockWastage.objects.none()

        qs = (
            StockWastage.objects
            .filter(restaurant=restaurant)
            .select_related('inventory_item', 'inventory_item__uom', 'uom', 'created_by__user')
            .order_by('-wastage_date', '-created_at')
        )

        item_id = self.request.query_params.get('item_id')
        if item_id:
            qs = qs.filter(inventory_item_id=item_id)

        reason = self.request.query_params.get('reason')
        if reason:
            qs = qs.filter(reason=reason)

        start_date = self.request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(wastage_date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(wastage_date__lte=end_date)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(inventory_item__name__icontains=search) |
                Q(inventory_item__sku__icontains=search) |
                Q(notes__icontains=search)
            )

        return qs

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.user_type == 'chef':
            raise PermissionDenied("Chefs are not permitted to record inventory wastage.")

        explicit_id = request.query_params.get('restaurant_id') or request.data.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        serializer = StockWastageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_profile = getattr(user, 'profile', None)
        item_id = serializer.validated_data['inventory_item_id']
        quantity = serializer.validated_data['quantity']
        uom_id = serializer.validated_data.get('uom_id')
        reason = serializer.validated_data.get('reason')
        notes = serializer.validated_data.get('notes', '')
        wastage_date = serializer.validated_data.get('wastage_date')

        wastage, movement, item = WastageService.record_wastage(
            restaurant=restaurant,
            inventory_item_id=item_id,
            quantity=quantity,
            uom_id=uom_id,
            reason=reason,
            notes=notes,
            user_profile=user_profile,
            wastage_date=wastage_date
        )

        return Response(
            {
                "message": f"Wastage for '{item.name}' recorded successfully.",
                "wastage": StockWastageSerializer(wastage).data,
                "current_stock": str(item.current_stock),
                "movement_id": movement.id
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        user = request.user
        explicit_id = request.query_params.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        data = WastageService.get_wastage_summary(restaurant)
        return Response(data, status=status.HTTP_200_OK)


class StockWastageSummaryAPIView(APIView):
    permission_classes = [HasInventoryAccess]

    def get(self, request):
        user = request.user
        explicit_id = request.query_params.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        data = WastageService.get_wastage_summary(restaurant)
        return Response(data, status=status.HTTP_200_OK)
