from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.restaurants.constants import OrderStatus
from apps.restaurants.models import Orders
from apps.restaurants.permissions import IsWaiter
from apps.restaurants.serializers import OrderSerializer
from django.db.models import Q


class ReadyOrdersAPIView(ListAPIView):
    """Return only prepared orders assigned to the logged-in waiter."""

    serializer_class = OrderSerializer
    permission_classes = [IsWaiter]

    def get_queryset(self):
        profile = self.request.user.profile
        restaurant = profile.restaurant

        if restaurant is None:
            return Orders.objects.none()

        return (
            Orders.objects
            .filter(
                order_status=OrderStatus.PREPARED,
                waiter=profile,
            )
            .filter(
                Q(table__restaurant=restaurant)
                | Q(items__menu_item__menu__restaurant=restaurant)
            )
            .distinct()
            .order_by("-created_at")
        )


class MarkServedAPIView(APIView):
    """Mark a prepared order as served for its assigned waiter."""

    permission_classes = [IsWaiter]

    def post(self, request, order_id):
        order = get_object_or_404(Orders, id=order_id)
        waiter_profile = request.user.profile

        if order.waiter_id != waiter_profile.id:
            return Response(
                {"detail": "You are not the waiter assigned to this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if (
            waiter_profile.restaurant_id
            and order.table_id
            and order.table.restaurant_id != waiter_profile.restaurant_id
        ):
            return Response(
                {"detail": "This order does not belong to your restaurant."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.order_status != OrderStatus.PREPARED:
            return Response(
                {
                    "detail": (
                        "Order must be Prepared before it can be marked Served."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.order_status = OrderStatus.SERVED
        order.save(update_fields=["order_status"])

        return Response({"message": "Order served successfully"})
