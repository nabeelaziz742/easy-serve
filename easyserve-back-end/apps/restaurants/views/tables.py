from rest_framework import viewsets
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from apps.restaurants.models import Table
from apps.restaurants.serializers import TableSerializer


class TableViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    queryset = Table.objects.all()
    serializer_class = TableSerializer

class QRScanView(generics.GenericAPIView):
    """
    Handles customer scanning QR codes for a restaurant table.
    """
    permission_classes = [AllowAny]
    serializer_class = TableSerializer

    def get(self, request, *args, **kwargs):
        restaurant_id = request.query_params.get("restaurant")
        table_number = request.query_params.get("table")

        if not restaurant_id or not table_number:
            return Response(
                {"error": "Missing restaurant or table info"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            table = Table.objects.select_related("restaurant", "waiter").get(
                restaurant_id=restaurant_id, table_number=table_number
            )
        except Table.DoesNotExist:
            return Response(
                {"error": "Invalid restaurant/table"},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = self.get_serializer(table).data

        if request.user.is_authenticated:
            # Registered customer → go to menu
            return Response({
                "status": "authenticated",
                "table": data,
                "redirect_to": "/menu/"  # frontend menu page
            })
        else:
            # Not registered → force signup/login but pass QR info
            return Response({
                "status": "unauthenticated",
                "table": data,
                "redirect_to": f"/register/?restaurant={restaurant_id}&table={table_number}"
            })
