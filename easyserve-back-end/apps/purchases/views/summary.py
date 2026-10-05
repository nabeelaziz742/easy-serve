from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from apps.purchases.permissions import HasPurchasesAccess
from apps.purchases.services import PurchaseService


class PurchasesSummaryAPIView(APIView):
    permission_classes = [HasPurchasesAccess]

    def get(self, request):
        explicit_id = request.query_params.get('restaurant_id')
        restaurant = PurchaseService.resolve_user_restaurant(request.user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        summary_data = PurchaseService.get_purchases_summary(restaurant)
        return Response(summary_data)
