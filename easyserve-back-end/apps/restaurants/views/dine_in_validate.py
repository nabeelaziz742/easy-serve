from django.db.models import Prefetch
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from apps.restaurants.constants import DineInSessionStatus
from apps.restaurants.models import (
    Restaurant,
    Table,
    Menu,
    MenuItem,
    DineInSession,
)
from apps.restaurants.serializers import (
    RestaurantSerializerForMenu,
    MenuSerializer
)
import logging


logger = logging.getLogger(__name__)


class DineInValidateAPIView(APIView):
    """
    Validate QR scan.
    - DOES NOT create session
    - Fetches menu & table info
    """

    authentication_classes = []  # QR is public
    permission_classes = [AllowAny]

    def post(self, request):
        restaurant_id = request.data.get("restaurant")
        table_number = request.data.get("table")
        logger.info(f"Table {table_number}")

        if not restaurant_id or not table_number:
            return Response(
                {"detail": "restaurant and table are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        restaurant = get_object_or_404(Restaurant, id=restaurant_id)
        if not restaurant:
            return Response(
                {"detail": "Invalid restaurant"},
                status=status.HTTP_404_NOT_FOUND
            )
        table = get_object_or_404(
            Table,
            restaurant=restaurant,
            table_number=table_number
        )

        recommended_tables = (
            Table.objects
            .filter(restaurant=restaurant)
            .exclude(id=table.id)
            .only("id", "table_number", "capacity")
        )

        if not table:
            return Response(
                {"detail": "Invalid table"},
            )

        active_session = (
            DineInSession.objects
            .filter(
                restaurant=restaurant,
                table=table,
                status=DineInSessionStatus.ACTIVE.value
            )
            .only("id", "guests")
            .first()
        )

        # Fetch menu
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

        if active_session:
            response["session"] = {
                "id": active_session.id,
                "guests": active_session.guests,
                "name": active_session.name,
                "phone": active_session.phone,
                "token": active_session.token,
            }

        return Response(response, status=status.HTTP_200_OK)
