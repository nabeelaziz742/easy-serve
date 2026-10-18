from rest_framework.exceptions import NotAuthenticated
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from apps.restaurants.models import Orders
from apps.restaurants.serializers import OrderSerializer
from apps.restaurants.services.dine_in_guest import get_dine_in_token


class DineInSessionOrdersAPIView(ListAPIView):
    """Orders of the table session in the guest's browser.

    The guest's "My Orders" page: everything ordered at this table during
    this visit, so they can pay with cash or card without an account.
    """

    permission_classes = [AllowAny]
    serializer_class = OrderSerializer

    def get_queryset(self):
        token = get_dine_in_token(self.request)
        if not token:
            raise NotAuthenticated("Scan the table QR code to see your orders.")
        return (
            Orders.objects
            .filter(dine_in_session__token=token, order_cancelled=False)
            .select_related("table", "waiter", "assigned_chef")
            .prefetch_related("items__menu_item")
            .order_by("-created_at")
        )