from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied

from apps.inventory.serializers import StockAdjustmentRequestSerializer, InventoryItemSerializer, StockMovementLogSerializer
from apps.inventory.permissions import HasInventoryAccess
from apps.inventory.services import StockService


class StockAdjustmentAPIView(APIView):
    permission_classes = [HasInventoryAccess]

    def post(self, request):
        user = request.user
        if user.user_type == 'chef':
            raise PermissionDenied("Chefs are not permitted to perform manual stock adjustments.")

        explicit_id = request.query_params.get('restaurant_id') or request.data.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        serializer = StockAdjustmentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item_id = serializer.validated_data['inventory_item_id']
        new_quantity = serializer.validated_data.get('new_quantity')
        quantity_delta = serializer.validated_data.get('quantity_delta')
        reason_text = serializer.get_effective_reason_text()
        notes = serializer.validated_data.get('notes', '')
        user_profile = getattr(user, 'profile', None)

        item, movement = StockService.adjust_stock(
            item_id=item_id,
            restaurant=restaurant,
            new_quantity=new_quantity,
            quantity_delta=quantity_delta,
            reason_text=reason_text,
            user_profile=user_profile,
            notes=notes
        )

        return Response({
            "message": "Stock adjusted successfully.",
            "item": InventoryItemSerializer(item, context={'request': request, 'restaurant': restaurant}).data,
            "movement": StockMovementLogSerializer(movement).data
        }, status=status.HTTP_200_OK)
