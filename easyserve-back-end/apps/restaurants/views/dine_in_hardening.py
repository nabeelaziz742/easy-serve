from rest_framework import status
from rest_framework.response import Response

from apps.restaurants.models import Restaurant, Table
from .dine_in_validate import DineInValidateAPIView as BaseDineInValidateAPIView
from .dine_in_session import DineInStartSessionAPIView as BaseDineInStartSessionAPIView


class DineInValidateAPIView(BaseDineInValidateAPIView):
    """Reject QR scans for inactive restaurants or inactive tables."""

    def post(self, request):
        restaurant_id = request.data.get("restaurant")
        table_number = request.data.get("table")

        if not restaurant_id or not table_number:
            return super().post(request)

        if not Restaurant.objects.filter(id=restaurant_id, is_active=True).exists():
            return Response(
                {"detail": "This restaurant is not currently available."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not Table.objects.filter(
            restaurant_id=restaurant_id,
            table_number=table_number,
            is_active=True,
        ).exists():
            return Response(
                {"detail": "This table is not currently available."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return super().post(request)


class DineInStartSessionAPIView(BaseDineInStartSessionAPIView):
    """Apply the same active restaurant/table checks when opening a session."""

    def post(self, request):
        restaurant_id = request.data.get("restaurant")
        table_number = request.data.get("table")

        if restaurant_id and not Restaurant.objects.filter(
            id=restaurant_id,
            is_active=True,
        ).exists():
            return Response(
                {"detail": "This restaurant is not currently available."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if restaurant_id and table_number and not Table.objects.filter(
            restaurant_id=restaurant_id,
            table_number=table_number,
            is_active=True,
        ).exists():
            return Response(
                {"detail": "This table is not currently available."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return super().post(request)
