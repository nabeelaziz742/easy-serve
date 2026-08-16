from django.db import transaction
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.restaurants.constants import OrderStatus
from apps.restaurants.models import Orders
from apps.restaurants.permissions import IsWaiter
from apps.restaurants.serializers import OrderSerializer
from apps.userprofile.models import UserProfile, Notification


class PendingOrderListAPIView(ListAPIView):
    """Orders that are genuinely waiting for waiter acceptance."""

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
                accepted_by_waiter=False,
                order_status=OrderStatus.TO_PREPARE,
            )
            .filter(
                Q(table__restaurant=restaurant)
                | Q(items__menu_item__menu__restaurant=restaurant)
            )
            .distinct()
            .order_by("-created_at")
        )


class WaiterAcceptOrderAPIView(APIView):
    """Accept an order and automatically assign the least-busy chef."""

    permission_classes = [IsWaiter]

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(
            Orders.objects.select_for_update(),
            id=order_id,
        )
        waiter = request.user.profile
        restaurant = waiter.restaurant

        if restaurant is None:
            return Response(
                {"detail": "Your waiter account is not assigned to a restaurant."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        belongs_to_restaurant = (
            (order.table_id and order.table.restaurant_id == restaurant.id)
            or order.items.filter(menu_item__menu__restaurant=restaurant).exists()
        )
        if not belongs_to_restaurant:
            return Response(
                {"detail": "This order does not belong to your restaurant."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.accepted_by_waiter:
            return Response(
                {"detail": "Order has already been accepted by a waiter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.order_status != OrderStatus.TO_PREPARE:
            return Response(
                {"detail": "Only new orders can be accepted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chefs = (
            UserProfile.objects
            .filter(user__user_type="chef", restaurant=restaurant, user__is_active=True)
            .annotate(
                active_order_count=Count(
                    "assigned_chef__id",
                    filter=Q(
                        assigned_chef__order_status__in=(
                            OrderStatus.TO_PREPARE,
                            OrderStatus.PREPARING,
                        )
                    ),
                )
            )
            .order_by("active_order_count", "id")
        )
        chef = chefs.first()

        if chef is None:
            return Response(
                {"detail": "No active chef is available for this restaurant."},
                status=status.HTTP_409_CONFLICT,
            )

        order.waiter = waiter
        order.accepted_by_waiter = True
        order.assigned_chef = chef
        order.save(update_fields=["waiter", "accepted_by_waiter", "assigned_chef", "updated_at"])

        Notification.objects.create(
            profile=chef,
            message=f"New order #{order.id} assigned to you",
        )

        return Response(
            {
                "message": "Order accepted and assigned to chef successfully.",
                "chef_id": chef.id,
                "order_id": order.id,
            },
            status=status.HTTP_200_OK,
        )


class ReadyOrdersAPIView(ListAPIView):
    """Only prepared orders assigned to the logged-in waiter."""

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

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(
            Orders.objects.select_for_update(),
            id=order_id,
        )
        waiter = request.user.profile

        if order.waiter_id != waiter.id:
            return Response(
                {"detail": "You are not the waiter assigned to this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if waiter.restaurant_id is None or not (
            (order.table_id and order.table.restaurant_id == waiter.restaurant_id)
            or order.items.filter(menu_item__menu__restaurant_id=waiter.restaurant_id).exists()
        ):
            return Response(
                {"detail": "This order does not belong to your restaurant."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.order_status != OrderStatus.PREPARED:
            return Response(
                {"detail": "Order must be Prepared before it can be marked Served."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.order_status = OrderStatus.SERVED
        order.save(update_fields=["order_status", "updated_at"])

        return Response({"message": "Order served successfully"}, status=status.HTTP_200_OK)
