from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.permissions import HasInventoryAccess
from apps.inventory.serializers import StockCountSubmitSerializer
from apps.inventory.services import StockService


class StockCountAPIView(APIView):
    """
    API endpoint for multi-item physical stock count reconciliation.
    Calculates variances, updates inventory balances, and generates auditable movement logs.
    """
    permission_classes = [HasInventoryAccess]

    def post(self, request):
        user = request.user
        if user.user_type == 'chef':
            raise PermissionDenied("Chefs are not permitted to submit physical stock counts.")

        explicit_id = request.query_params.get('restaurant_id') or request.data.get('restaurant_id')
        restaurant = StockService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        serializer = StockCountSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items_data = serializer.validated_data['items']
        audit_notes = serializer.validated_data.get('audit_notes', '')
        user_profile = getattr(user, 'profile', None)

        results = StockService.perform_physical_stock_count(
            restaurant=restaurant,
            items_counts=items_data,
            user_profile=user_profile,
            audit_notes=audit_notes
        )

        return Response({
            "message": f"Physical stock count processed successfully. {results['adjusted_items_count']} items reconciled.",
            **results
        }, status=status.HTTP_200_OK)
