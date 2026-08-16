import stripe

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payment.models import Payment
from apps.restaurants.constants import PaymentStatus
from apps.restaurants.models import Orders
from apps.restaurants.services.table_lifecycle import release_table_after_payment

stripe.api_key = settings.STRIPE_SECRET_KEY


class CreatePaymentIntentAPIView(APIView):
    """
    Creates (or re-uses) a Stripe PaymentIntent for an order and returns
    the client_secret the frontend needs to confirm payment with Stripe.js.

    POST /api/payment/create-intent/
    body: {"order_id": 12}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")

        if not order_id:
            return Response(
                {"detail": "order_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not settings.STRIPE_SECRET_KEY:
            return Response(
                {"detail": "Online payments are not configured on this server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        order = get_object_or_404(Orders, id=order_id)

        profile = getattr(request.user, "profile", None)
        if profile is None or order.user_id != profile.id:
            return Response(
                {"detail": "You are not allowed to pay for this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.payment_status == PaymentStatus.CONFIRMED.value:
            return Response(
                {"detail": "This order is already paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount_cents = int(order.total_price * 100)

        payment, _ = Payment.objects.get_or_create(
            order=order,
            defaults={
                "amount": order.total_price,
                "method": "online",
                "status": "pending",
            },
        )

        try:
            if payment.transaction_id:
                intent = stripe.PaymentIntent.retrieve(payment.transaction_id)

                if intent.status == "succeeded":
                    return Response(
                        {"detail": "This order is already paid."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if intent.amount != amount_cents:
                    intent = stripe.PaymentIntent.modify(
                        intent.id, amount=amount_cents
                    )
            else:
                intent = stripe.PaymentIntent.create(
                    amount=amount_cents,
                    currency="usd",
                    metadata={"order_id": str(order.id)},
                    automatic_payment_methods={"enabled": True},
                )
                payment.transaction_id = intent.id
                payment.amount = order.total_price
                payment.method = "online"
                payment.save()
        except stripe.error.StripeError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "client_secret": intent.client_secret,
                "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
                "amount": str(order.total_price),
            },
            status=status.HTTP_200_OK,
        )


class ConfirmPaymentAPIView(APIView):
    """
    Fallback confirmation endpoint for local/demo environments where a
    public webhook URL isn't reachable. The frontend calls this right
    after Stripe.js confirms the card payment; it double-checks the
    PaymentIntent status directly with Stripe before marking anything paid.

    POST /api/payment/confirm/
    body: {"order_id": 12}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        order = get_object_or_404(Orders, id=order_id)

        profile = getattr(request.user, "profile", None)
        if profile is None or order.user_id != profile.id:
            return Response(
                {"detail": "You are not allowed to confirm payment for this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            payment = order.payment
        except Payment.DoesNotExist:
            return Response(
                {"detail": "No payment found for this order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not payment.transaction_id:
            return Response(
                {"detail": "Payment was never started for this order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            intent = stripe.PaymentIntent.retrieve(payment.transaction_id)
        except stripe.error.StripeError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        if intent.status == "succeeded":
            payment.status = "success"
            payment.paid_at = timezone.now()
            payment.save()

            order.payment_status = PaymentStatus.CONFIRMED.value
            order.save(update_fields=["payment_status"])

            if order.order_status == 4:
                release_table_after_payment(order)

            return Response(
                {"detail": "Payment confirmed.", "payment_status": "Confirmed"},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": f"Payment not completed yet (status: {intent.status})."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class StripeWebhookAPIView(APIView):
    """
    Production Stripe webhook. Marks the order paid the moment Stripe
    confirms the charge, independent of whether the client is still open.

    POST /api/payment/webhook/   (configured in the Stripe dashboard)
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

        if not settings.STRIPE_WEBHOOK_SECRET:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if event["type"] == "payment_intent.succeeded":
            intent = event["data"]["object"]

            payment = Payment.objects.filter(
                transaction_id=intent["id"]
            ).first()

            if payment:
                payment.status = "success"
                payment.paid_at = timezone.now()
                payment.save()

                order = payment.order
                order.payment_status = PaymentStatus.CONFIRMED.value
                order.save(update_fields=["payment_status"])

                if order.order_status == 4:
                    release_table_after_payment(order)

        return Response(status=status.HTTP_200_OK)
