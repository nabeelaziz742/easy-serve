from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.restaurants.constants import OrderStatus, PaymentMethod, PaymentStatus
from apps.restaurants.models import Orders, PaymentDetails
from apps.restaurants.permissions import IsManager
from apps.restaurants.serializers import OrderSerializer
from apps.restaurants.services.order_access import (
    staff_belongs_to_order_restaurant,
    staff_restaurant_ids,
)
from apps.userprofile.models import Notification

MANAGER_ROLES = ("manager", "restaurant_owner", "super_admin")
CANCEL_ROLES = ("waiter",) + MANAGER_ROLES


class ManagerOrderSerializer(OrderSerializer):
    cancelled_by_name = serializers.SerializerMethodField()

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + [
            'order_cancelled',
            'cancellation_reason',
            'cancelled_at',
            'cancelled_by_name',
            'refund_amount',
            'created_at',
        ]

    def get_cancelled_by_name(self, obj):
        return obj.cancelled_by.full_name if obj.cancelled_by_id else None


class ManagerOrderListAPIView(ListAPIView):
    """Every order of the manager's restaurant, newest first, for the
    Orders & Bills page.

    Query params: period (today, 7d, 30d, all; default today), status
    (active, served, cancelled, unpaid) and search (order or table number).
    """
    permission_classes = [IsManager]
    serializer_class = ManagerOrderSerializer

    def get_queryset(self):
        user = self.request.user
        orders = Orders.objects.all()
        if user.user_type != "super_admin":
            restaurant_ids = staff_restaurant_ids(user)
            if not restaurant_ids:
                return Orders.objects.none()
            orders = orders.filter(
                Q(table__restaurant_id__in=restaurant_ids)
                | Q(dine_in_session__restaurant_id__in=restaurant_ids)
                | Q(items__menu_item__menu__restaurant_id__in=restaurant_ids)
            )

        # Only orders the customer actually placed; an abandoned cart that
        # never reached checkout is not an order to bill.
        orders = orders.filter(ordered=True)

        params = self.request.query_params
        period = params.get("period", "today")
        days = {"today": 0, "7d": 6, "30d": 29}.get(period)
        if days is not None:
            start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days)
            orders = orders.filter(created_at__gte=start)

        order_filter = params.get("status")
        if order_filter == "active":
            orders = orders.filter(order_cancelled=False).exclude(order_status=OrderStatus.SERVED.value)
        elif order_filter == "served":
            orders = orders.filter(order_cancelled=False, order_status=OrderStatus.SERVED.value)
        elif order_filter == "cancelled":
            orders = orders.filter(order_cancelled=True)
        elif order_filter == "unpaid":
            orders = orders.filter(order_cancelled=False).exclude(payment_status=PaymentStatus.CONFIRMED.value)

        search = (params.get("search") or "").strip().lstrip("#")
        if search.isdigit():
            orders = orders.filter(Q(id=int(search)) | Q(table__table_number=int(search)))

        return (
            orders.select_related("table", "waiter", "assigned_chef", "cancelled_by")
            .prefetch_related("items__menu_item")
            .distinct()
            .order_by("-created_at")
        )


class CancelOrderAPIView(APIView):
    """Cancel an order with a reason.

    A waiter can cancel an order only before the kitchen starts on it and
    before any money changed hands. Managers and owners can cancel any
    order; when it was already paid, the amount is recorded as refunded so
    reports and the cash drawer stay correct.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, order_id):
        user = request.user
        if user.user_type not in CANCEL_ROLES:
            return Response({"detail": "You are not allowed to cancel orders."}, status=status.HTTP_403_FORBIDDEN)

        order = get_object_or_404(Orders.objects.select_for_update(), id=order_id)
        if not staff_belongs_to_order_restaurant(user, order):
            return Response({"detail": "This order does not belong to your restaurant."}, status=status.HTTP_403_FORBIDDEN)

        if order.order_cancelled:
            return Response({"detail": "This order is already cancelled."}, status=status.HTTP_400_BAD_REQUEST)

        reason = str(request.data.get("reason") or "").strip()
        if len(reason) < 3:
            return Response({"detail": "Please write a reason for cancelling."}, status=status.HTTP_400_BAD_REQUEST)

        payment = PaymentDetails.objects.select_for_update().filter(order=order).order_by("-id").first()
        cash_taken = bool(
            payment
            and payment.payment_method == PaymentMethod.CATCH_ON_DELIVERY.value
            and payment.cash_received_by_id
        )
        money_taken = order.payment_status == PaymentStatus.CONFIRMED.value or cash_taken

        if user.user_type == "waiter":
            if order.order_status != OrderStatus.TO_PREPARE.value or money_taken:
                return Response(
                    {"detail": "The kitchen has started or the bill is paid. Ask the manager to cancel this order."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        order.order_cancelled = True
        order.cancellation_reason = reason[:255]
        order.cancelled_at = timezone.now()
        order.cancelled_by = user.profile
        order.refund_amount = order.total_price if money_taken else 0
        order.save(update_fields=[
            "order_cancelled", "cancellation_reason", "cancelled_at",
            "cancelled_by", "refund_amount", "updated_at",
        ])

        # Cash that was requested but never settled leaves the waiter's
        # collect list and the manager's settlement list.
        if payment and payment.payment_status == PaymentStatus.PENDING.value:
            payment.payment_status = PaymentStatus.CANCELLED.value
            payment.save(update_fields=["payment_status", "updated_at"])

        if order.waiter_id and order.waiter_id != user.profile.id:
            Notification.objects.create(
                profile=order.waiter,
                message=f"Order #{order.id} was cancelled: {reason}"[:255],
            )

        return Response(ManagerOrderSerializer(order).data, status=status.HTTP_200_OK)
