from django.urls import path

from apps.payment.views import (
    CreatePaymentIntentAPIView,
    ConfirmPaymentAPIView,
    StripeWebhookAPIView,
)

urlpatterns = [
    path(
        "create-intent/",
        CreatePaymentIntentAPIView.as_view(),
        name="create-payment-intent",
    ),
    path(
        "confirm/",
        ConfirmPaymentAPIView.as_view(),
        name="confirm-payment",
    ),
    path(
        "webhook/",
        StripeWebhookAPIView.as_view(),
        name="stripe-webhook",
    ),
]
