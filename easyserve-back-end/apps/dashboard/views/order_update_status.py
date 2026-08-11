from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import UpdateAPIView

from apps.dashboard.serializers import OrderStatusUpdateSerializer
from apps.dashboard.repositories import OrdersRepository
from apps.dashboard.services import OrderService


class OrderStatusUpdateView(UpdateAPIView):
    serializer_class = OrderStatusUpdateSerializer

    def get_object(self):
        return OrdersRepository.get_order(self.kwargs["pk"])

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
