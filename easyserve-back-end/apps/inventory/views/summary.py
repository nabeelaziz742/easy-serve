from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from apps.inventory.permissions import HasInventoryAccess
from apps.inventory.services import StockService


class InventorySummaryAPIView(APIView):
    permission_classes = [HasInventoryAccess]

    def get(self, request):
        explicit_id = request.query_params.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(request.user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        summary_data = StockService.get_inventory_summary(restaurant)
        return Response(summary_data)
