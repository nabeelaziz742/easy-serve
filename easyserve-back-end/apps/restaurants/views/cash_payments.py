from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.restaurants.constants import PaymentMethod, PaymentStatus, OrderStatus, TableState
from apps.restaurants.models import Orders, PaymentDetails
from apps.restaurants.permissions import IsManager, IsWaiter
from apps.restaurants.serializers import OrderDetailSerializer
from apps.restaurants.services.table_lifecycle import release_table_after_payment


class RequestCashPaymentAPIView(APIView):
    """Customer requests cash payment; this NEVER confirms the payment."""
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order = get_object_or_404(Orders, id=order_id)
        profile = request.user.profile
        if order.user_id != profile.id:
            return Response({"detail": "You are not allowed to pay for this order."}, status=status.HTTP_403_FORBIDDEN)
        if order.order_cancelled:
            return Response({"detail": "Cannot pay for a cancelled order."}, status=status.HTTP_400_BAD_REQUEST)
        if order.payment_status == PaymentStatus.CONFIRMED.value:
            return Response({"detail": "This order has already been paid."}, status=status.HTTP_400_BAD_REQUEST)

        PaymentDetails.objects.update_or_create(
            order=order,
            defaults={
                "user": profile,
                "payment_method": PaymentMethod.CATCH_ON_DELIVERY.value,
                "payment_status": PaymentStatus.PENDING.value,
                "cash_received_by": None,
                "cash_received_at": None,
                "cash_settled_by": None,
                "cash_settled_at": None,
            },
        )
        order.payment_status = PaymentStatus.PENDING.value
        order.save(update_fields=["payment_status"])
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_200_OK)


class ReceiveCashPaymentAPIView(APIView):
    """Waiter records physical cash receipt for a served restaurant order."""
    permission_classes = [IsWaiter]

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(Orders.objects.select_for_update(), id=order_id)
        waiter = request.user.profile

        if waiter.restaurant_id is None:
            return Response({"detail": "Your waiter account is not assigned to a restaurant."}, status=status.HTTP_400_BAD_REQUEST)

        if not order.table or order.table.restaurant_id != waiter.restaurant_id:
            return Response({"detail": "This order does not belong to your restaurant."}, status=status.HTTP_403_FORBIDDEN)

        if order.order_status != OrderStatus.SERVED:
            return Response({"detail": "Cash can only be received after the order has been served."}, status=status.HTTP_400_BAD_REQUEST)

        if order.payment_status == PaymentStatus.CONFIRMED.value:
            return Response({"detail": "Payment is already settled."}, status=status.HTTP_400_BAD_REQUEST)

        if order.waiter_id != waiter.id:
            order.waiter = waiter
            order.save(update_fields=["waiter", "updated_at"])

        payment = PaymentDetails.objects.select_for_update().filter(order=order).first()
        if payment is None:
            payment = PaymentDetails.objects.create(
                user=order.user,
                order=order,
                payment_method=PaymentMethod.CATCH_ON_DELIVERY.value,
                payment_status=PaymentStatus.PENDING.value,
            )
        elif payment.payment_method != PaymentMethod.CATCH_ON_DELIVERY.value:
            return Response({"detail": "This order is not a cash payment."}, status=status.HTTP_400_BAD_REQUEST)

        if payment.cash_received_by_id:
            return Response({"detail": "Cash has already been received by a waiter."}, status=status.HTTP_400_BAD_REQUEST)
        if payment.cash_settled_by_id:
            return Response({"detail": "Cash is already settled."}, status=status.HTTP_400_BAD_REQUEST)

        payment.cash_received_by = waiter
        payment.cash_received_at = now()
        payment.payment_status = PaymentStatus.PENDING.value
        payment.save(update_fields=["cash_received_by", "cash_received_at", "payment_status", "updated_at"])

        order.table.table_state = TableState.PAYMENT_PENDING.value
        order.table.save(update_fields=["table_state", "updated_at"])

        return Response({
            "message": "Cash received and recorded. Awaiting manager settlement.",
            "payment_status": "cash_received",
            "amount": str(order.total_price),
            "waiter": str(waiter),
        })


class SettleCashPaymentAPIView(APIView):
    """Manager/cashier performs final cash settlement."""
    permission_classes = [IsManager]

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(Orders.objects.select_for_update(), id=order_id)
        manager = request.user.profile
        # Owners (no separate staff "manager" profile) relate to a
        # restaurant via owned_restaurants, not profile.restaurant — which
        # is only populated for staff explicitly assigned to a restaurant.
        # Checking only manager.restaurant_id incorrectly blocked owners
        # from ever settling cash for their own restaurant, permanently
        # stranding the table in "Awaiting Payment".
        order_restaurant_id = order.table.restaurant_id if order.table else None
        has_access = order_restaurant_id is not None and (
            manager.restaurant_id == order_restaurant_id
            or manager.owned_restaurants.filter(id=order_restaurant_id).exists()
        )
        if not has_access:
            return Response({"detail": "This order does not belong to your restaurant."}, status=status.HTTP_403_FORBIDDEN)
        if order.order_cancelled:
            return Response({"detail": "Cannot settle a cancelled order."}, status=status.HTTP_400_BAD_REQUEST)
        if order.order_status != OrderStatus.SERVED:
            return Response({"detail": "Cash can only be settled after the order has been served."}, status=status.HTTP_400_BAD_REQUEST)
        if order.payment_status == PaymentStatus.CONFIRMED.value:
            return Response({"detail": "Payment is already settled."}, status=status.HTTP_400_BAD_REQUEST)

        payment = PaymentDetails.objects.select_for_update().filter(order=order).first()
        if not payment or payment.payment_method != PaymentMethod.CATCH_ON_DELIVERY.value:
            return Response({"detail": "Cash payment has not been requested."}, status=status.HTTP_400_BAD_REQUEST)
        if not payment.cash_received_by_id:
            return Response({"detail": "Waiter has not recorded cash receipt yet."}, status=status.HTTP_400_BAD_REQUEST)
        if payment.cash_settled_by_id:
            return Response({"detail": "Cash is already settled."}, status=status.HTTP_400_BAD_REQUEST)

        payment.cash_settled_by = manager
        payment.cash_settled_at = now()
        payment.payment_status = PaymentStatus.CONFIRMED.value
        payment.save(update_fields=["cash_settled_by", "cash_settled_at", "payment_status", "updated_at"])
        order.payment_status = PaymentStatus.CONFIRMED.value
        order.save(update_fields=["payment_status"])
        release_table_after_payment(order)

        return Response({
            "message": "Cash settled successfully.",
            "payment_status": "confirmed",
            "amount": str(order.total_price),
            "waiter": str(payment.cash_received_by),
            "manager": str(manager),
        })


class WaiterCashOrdersAPIView(ListAPIView):
    """Cash orders assigned to the logged-in waiter that have not yet been received."""
    permission_classes = [IsWaiter]
    serializer_class = OrderDetailSerializer

    def get_queryset(self):
        waiter = self.request.user.profile
        return Orders.objects.filter(
            waiter=waiter,
            paymentdetails__payment_method=PaymentMethod.CATCH_ON_DELIVERY.value,
            paymentdetails__payment_status=PaymentStatus.PENDING.value,
            paymentdetails__cash_received_by__isnull=True,
            paymentdetails__cash_settled_by__isnull=True,
        ).select_related("table", "user", "waiter").prefetch_related("items__menu_item").distinct().order_by("-created_at")


class ManagerCashOrdersAPIView(ListAPIView):
    """Cash orders in the manager's restaurant where the waiter has received cash but manager has not settled it."""
    permission_classes = [IsManager]
    serializer_class = OrderDetailSerializer

    def get_queryset(self):
        manager = self.request.user.profile
        # Owners (no separate staff "manager" profile) relate to a
        # restaurant via owned_restaurants, not profile.restaurant — which
        # is only populated for staff explicitly assigned to a restaurant.
        # Filtering only by manager.restaurant hid every pending
        # settlement from an owner, even though they are allowed to
        # settle cash via SettleCashPaymentAPIView. Mirror that view's
        # access rule here so the list matches what they can act on.
        restaurant_ids = list(manager.owned_restaurants.values_list("id", flat=True))
        if manager.restaurant_id:
            restaurant_ids.append(manager.restaurant_id)

        if not restaurant_ids:
            return Orders.objects.none()

        return Orders.objects.filter(
            table__restaurant_id__in=restaurant_ids,
            paymentdetails__payment_method=PaymentMethod.CATCH_ON_DELIVERY.value,
            paymentdetails__payment_status=PaymentStatus.PENDING.value,
            paymentdetails__cash_received_by__isnull=False,
            paymentdetails__cash_settled_by__isnull=True,
        ).select_related("table", "user", "waiter").prefetch_related("items__menu_item").distinct().order_by("-created_at")
