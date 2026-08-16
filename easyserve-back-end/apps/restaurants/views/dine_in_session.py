from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.restaurants.constants import DineInSessionStatus, TableState
from apps.restaurants.models import DineInSession, Restaurant, Table


class DineInStartSessionAPIView(APIView):
    """
    Start the physical dine-in session after the guest count is confirmed.

    This is intentionally public because a customer reaches this endpoint
    through the table QR code without being authenticated.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        restaurant_id = request.data.get("restaurant")
        table_number = request.data.get("table")
        guests = request.data.get("guests")
        name = (request.data.get("name") or "").strip()
        phone = (request.data.get("phone") or "").strip()
        session_token = request.data.get("session_token")

        if not restaurant_id or not table_number or guests in (None, ""):
            return Response(
                {"detail": "restaurant, table and guests are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            guests = int(guests)
        except (TypeError, ValueError):
            return Response(
                {"detail": "guests must be a valid number"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        restaurant = get_object_or_404(Restaurant, id=restaurant_id)

        with transaction.atomic():
            table = (
                Table.objects
                .select_for_update()
                .get(restaurant=restaurant, table_number=table_number)
            )

            if guests < 1 or guests > table.capacity:
                return Response(
                    {
                        "detail": (
                            f"Guest count must be between 1 and "
                            f"{table.capacity} for this table."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            active_session = (
                DineInSession.objects
                .select_for_update()
                .filter(
                    restaurant=restaurant,
                    table=table,
                    status=DineInSessionStatus.ACTIVE.value,
                )
                .first()
            )

            # Allow the same browser/session to safely retry the request.
            if active_session:
                if session_token and str(active_session.token) == str(session_token):
                    active_session.guests = guests
                    active_session.name = name
                    active_session.phone = phone
                    active_session.save(update_fields=["guests", "name", "phone", "updated_at"])

                    table.table_state = TableState.OCCUPIED.value
                    table.customer_count = guests
                    table.save(update_fields=["table_state", "customer_count", "updated_at"])
                else:
                    return Response(
                        {"detail": "This table is currently occupied."},
                        status=status.HTTP_409_CONFLICT,
                    )
            else:
                if table.table_state != TableState.EMPTY.value:
                    return Response(
                        {"detail": "This table is not currently available."},
                        status=status.HTTP_409_CONFLICT,
                    )

                try:
                    active_session = DineInSession.objects.create(
                        restaurant=restaurant,
                        table=table,
                        guests=guests,
                        name=name,
                        phone=phone,
                        status=DineInSessionStatus.ACTIVE.value,
                    )
                except IntegrityError:
                    return Response(
                        {"detail": "This table was just occupied. Please scan again."},
                        status=status.HTTP_409_CONFLICT,
                    )

                table.table_state = TableState.OCCUPIED.value
                table.customer_count = guests
                table.save(update_fields=["table_state", "customer_count", "updated_at"])

        return Response(
            {
                "active_session": True,
                "session": {
                    "id": active_session.id,
                    "guests": active_session.guests,
                    "name": active_session.name,
                    "phone": active_session.phone,
                    "token": str(active_session.token),
                },
                "table": {
                    "id": table.id,
                    "number": table.table_number,
                    "capacity": table.capacity,
                    "state": table.get_table_state_display(),
                    "customer_count": table.customer_count,
                },
            },
            status=status.HTTP_200_OK,
        )
