from django.db import transaction
from rest_framework.response import Response
from rest_framework import status

from apps.restaurants.constants import PaymentMethod, PaymentStatus
from apps.restaurants.models import PaymentDetails

from .orders import PayOrderAPIView


_original_pay_order_post = PayOrderAPIView.post


def _pay_order_post(self, request, order_id):
    """Keep customer cash payments pending until restaurant staff confirms them."""
    order = PayOrderAPIView.get_object_or_404(Orders, id=order_id) if False else None

    profile = request.user.profile
    is_owner = getattr(self, "_get_order_owner", None)

    # Resolve the order through the original endpoint's model without changing
    # its existing staff-confirmation implementation.
    from django.shortcuts import get_object_or_404
    from apps.restaurants.models import Orders

    order = get_object_or_404(Orders, id=order_id)
    is_owner = order.user_id == profile.id
    is_staff = getattr(request.user, "user_type", None) in (
        "waiter",
        "manager",
        "super_admin",
    )

    if is_owner and not is_staff:
        if order.payment_status == PaymentStatus.CONFIRMED.value:
            return Response(
                {"detail": "This order has already been paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.order_cancelled:
            return Response(
                {"detail": "Cannot pay for a cancelled order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        method_key = request.data.get("payment_method", "cash")
        if method_key != "cash":
            return Response(
                {"detail": "Customer payment requests are currently supported for cash only."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            PaymentDetails.objects.update_or_create(
                order=order,
                defaults={
                    "user": order.user,
                    "payment_method": PaymentMethod.CATCH_ON_DELIVERY.value,
                    "payment_status": PaymentStatus.PENDING.value,
                    "receipt_image": request.FILES.get("receipt_image"),
                },
            )

        return Response(
            {
                "message": "Cash payment request submitted. Waiting for restaurant confirmation.",
                "payment_pending": True,
            },
            status=status.HTTP_200_OK,
        )

    return _original_pay_order_post(self, request, order_id)


PayOrderAPIView.post = _pay_order_post
