from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.restaurants.constants import DineInSessionStatus, OrderType
from apps.restaurants.models import DineInSession, MenuItem, Restaurant, Table
from apps.restaurants.services.dine_in_guest import checkout_customer

from .orders import OrderCheckoutAPIView


class SecureOrderCheckoutAPIView(OrderCheckoutAPIView):
    """
    Hardened checkout entry point.

    Dine-in orders must prove that they belong to the active QR/session
    before the order is created. The validated numeric guest count is also
    normalized before handing the request to the existing checkout flow.
    """

    # Dine-in guests order without an account: the active table session
    # token is their authorisation. Every other order type still needs a
    # logged-in customer (checked below).
    permission_classes = [AllowAny]

    def get_customer(self, request):
        return getattr(self, "_customer", None) or super().get_customer(request)

    def post(self, request):
        data = request.data
        order_type_key = data.get("order_type", "DELIVERY")

        try:
            order_type = OrderType[order_type_key].value
        except (KeyError, TypeError):
            order_type = None

        if order_type != OrderType.DINE_IN.value:
            if not request.user.is_authenticated:
                raise NotAuthenticated()
            return super().post(request)

        restaurant_id = data.get("restaurant")
        table_number = data.get("table")
        session_token = data.get("session_token")

        if not restaurant_id or not table_number or not session_token:
            return Response(
                {"detail": "restaurant, table and session_token are required for dine-in checkout."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        restaurant = get_object_or_404(Restaurant, id=restaurant_id, is_active=True)
        table = get_object_or_404(Table, restaurant=restaurant, table_number=table_number, is_active=True)

        # The session closes when the bill is settled. A browser that still
        # holds the old token used to get a bare 404 here, which the cart
        # showed as "Checkout failed: {}" on every attempt.
        session = DineInSession.objects.filter(
            restaurant=restaurant,
            table=table,
            token=session_token,
            status=DineInSessionStatus.ACTIVE.value,
        ).first()
        if session is None:
            return Response(
                {
                    "detail": "Your table session has ended. Please scan the table QR code again to order.",
                    "code": "dine_in_session_ended",
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            guests = int(data.get("guests", session.guests))
        except (TypeError, ValueError):
            return Response({"detail": "guests must be a valid number."}, status=status.HTTP_400_BAD_REQUEST)

        if guests < 1 or guests > table.capacity:
            return Response(
                {"detail": f"Guest count must be between 1 and {table.capacity} for this table."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item_ids = []
        for item in data.get("items", []):
            try:
                item_ids.append(int(item["menu_item"]))
            except (KeyError, TypeError, ValueError):
                return Response(
                    {"detail": "Each order item must contain a valid menu_item."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not item_ids:
            return Response({"detail": "Items are required."}, status=status.HTTP_400_BAD_REQUEST)

        invalid_item_exists = MenuItem.objects.filter(
            id__in=item_ids,
            is_available=True,
            menu__is_active=True,
            menu__restaurant=restaurant,
        ).count() != len(set(item_ids))

        if invalid_item_exists:
            return Response(
                {"detail": "One or more selected menu items are unavailable or do not belong to this restaurant."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Request.data can be a QueryDict and cannot safely be mutated in place.
        normalized_data = data.copy()
        normalized_data["guests"] = guests
        normalized_data["session_token"] = session_token
        request._full_data = normalized_data
        self._customer = checkout_customer(request, session)

        return super().post(request)