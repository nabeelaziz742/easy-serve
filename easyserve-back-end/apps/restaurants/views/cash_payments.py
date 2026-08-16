from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.restaurants.constants import PaymentMethod, PaymentStatus
from apps.restaurants.models import Orders, PaymentDetails
from apps.restaurants.permissions import IsManager, IsWaiter
from apps.restaurants.serializers import OrderDetailSerializer


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
    """Assigned waiter records that physical cash was received."""
    permission_classes = [IsWaiter]

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(Orders.objects.select_for_update(), id=order_id)
        waiter = request.user.profile

        if order.waiter_id != waiter.id:
            return Response({"detail": "Only the assigned waiter can receive this cash."}, status=status.HTTP_403_FORBIDDEN)
        if not order.table or order.table.restaurant_id != waiter.restaurant_id:
            return Response({"detail": "This order does not belong to your restaurant."}, status=status.HTTP_403_FORBIDDEN)
        if order.payment_status == PaymentStatus.CONFIRMED.value:
            return Response({"detail": "Payment is already settled."}, status=status.HTTP_400_BAD_REQUEST)

        payment = PaymentDetails.objects.select_for_update().filter(order=order).first()
        if not payment or payment.payment_method != PaymentMethod.CATCH_ON_DELIVERY.value:
            return Response({"detail": "Cash payment has not been requested."}, status=status.HTTP_400_BAD_REQUEST)
        if payment.cash_received_by_id:
            return Response({"detail": "Cash has already been received by a waiter."}, status=status.HTTP_400_BAD_REQUEST)

        payment.cash_received_by = waiter
        payment.cash_received_at = now()
        payment.payment_status = PaymentStatus.PENDING.value
        payment.save(update_fields=["cash_received_by", "cash_received_at", "payment_status", "updated_at"])

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

        if not order.table or order.table.restaurant_id != manager.restaurant_id:
            return Response({"detail": "This order does not belong to your restaurant."}, status=status.HTTP_403_FORBIDDEN)
        if order.order_cancelled:
            return Response({"detail": "Cannot settle a cancelled order."}, status=status.HTTP_400_BAD_REQUEST)
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

        return Response({
            "message": "Cash settled successfully.",
            "payment_status": "confirmed",
            "amount": str(order.total_price),
            "waiter": str(payment.cash_received_by),
            "manager": str(manager),
        })
