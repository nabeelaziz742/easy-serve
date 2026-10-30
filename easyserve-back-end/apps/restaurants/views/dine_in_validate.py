from django.db.models import Prefetch
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.restaurants.services.reservations import booking_at_table
from apps.restaurants.services.table_access import get_scanned_table, read_scan
from apps.restaurants.services.table_lifecycle import clean_and_get_active_session
from apps.restaurants.models import Table, Menu, MenuItem
from apps.restaurants.serializers import (
    RestaurantSerializerForMenu,
    MenuSerializer
)


class DineInValidateAPIView(APIView):
    """
    Validate QR scan.
    - DOES NOT create session
    - Fetches menu & table info

    Only a scan with the table's QR key gets through, so the running
    session returned here (which lets friends at the table order on the
    same bill) is only handed to people holding the printed QR.
    """

    authentication_classes = []  # QR is public
    permission_classes = [AllowAny]

    def post(self, request):
        table = get_scanned_table(*read_scan(request.data))
        restaurant = table.restaurant

        recommended_tables = (
            Table.objects
            .filter(restaurant=restaurant, is_active=True)
            .exclude(id=table.id)
            .only("id", "table_number", "capacity")
        )

        active_session = clean_and_get_active_session(table, restaurant=restaurant)

        menus = (
            Menu.objects
            .filter(restaurant=restaurant, is_active=True)
            .prefetch_related(
                Prefetch(
                    "menu_items",
                    queryset=MenuItem.objects.filter(is_available=True)
                )
            )
        )

        response = {
            "restaurant": RestaurantSerializerForMenu(restaurant).data,
            "active_session": bool(active_session),
            "table": {
                "id": table.id,
                "number": table.table_number,
                "capacity": table.capacity,
            },
            "recommended_tables": [
                {
                    "id": t.id,
                    "number": t.table_number,
                    "capacity": t.capacity,
                }
                for t in recommended_tables
            ],
            "menus": MenuSerializer(menus, many=True).data,
        }

        # Greet a guest whose booking is at this table and let them fill in
        # their details from it.
        booking = None if active_session else booking_at_table(table)
        response["booking"] = (
            {"name": booking.name, "guests": booking.guest_count, "time": timezone.localtime(booking.reservation_time).strftime("%H:%M")}
            if booking
            else None
        )

        if active_session:
            response["session"] = {
                "id": active_session.id,
                "guests": active_session.guests,
                "name": active_session.name,
                "phone": active_session.phone,
                "token": active_session.token,
            }

        return Response(response, status=status.HTTP_200_OK)
