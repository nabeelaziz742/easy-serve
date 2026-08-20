from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound

from apps.dashboard.serializers import OrderStatusUpdateSerializer
from apps.dashboard.repositories import OrdersRepository
from apps.dashboard.services import OrderService


class OrderStatusUpdateView(UpdateAPIView):
    serializer_class = OrderStatusUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        order = OrdersRepository.get_order(self.kwargs["pk"])
        if order is None:
            raise NotFound()

        # Tenant isolation: a logged-in user may only act on orders
        # belonging to a restaurant they're staff of or own. Without this,
        # any authenticated account could change any restaurant's order
        # status by guessing/incrementing the numeric order ID.
        profile = getattr(self.request.user, "profile", None)
        restaurant_id = OrdersRepository.get_order_restaurant_id(order)
        if profile is None or not OrdersRepository.user_can_access_restaurant(profile, restaurant_id):
            # 404 rather than 403 so we don't leak that the order exists.
            raise NotFound()

        return order

    def update(self, request, *args, **kwargs):
        order = self.get_object()

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        label = serializer.validated_data["status"]

        try:
            updated_order = OrderService.change_status(order, label)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "Order status updated successfully",
            "order_id": updated_order.id,
            "new_status": updated_order.order_status
        })