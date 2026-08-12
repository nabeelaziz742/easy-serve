from rest_framework.generics import RetrieveAPIView, ListCreateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.restaurants.serializers import (
    ReservationCreateSerializer,
    ReservationDetailSerializer,
)
from apps.restaurants.models import Restaurant, Reservation
from apps.restaurants.constants import ReservationStatus
import logging

from utils.paginations import LimitOffsetOf10Pagination

logger = logging.getLogger(__name__)

#
# class ReservationCreateAPIView(APIView):
#     permission_classes = [AllowAny]
#
#     def post(self, request, restaurant_id=None):
#
#         if not restaurant_id:
#             restaurant_id = Restaurant.objects.first().id
#
#         logger.info(f"restaurant_id {restaurant_id}")
#
#         restaurant = get_object_or_404(Restaurant, id=restaurant_id)
#
#         logger.info(f"restaurant {restaurant.name}")
#
#         request.data['restaurant'] = restaurant.id
#
#         serializer = ReservationCreateSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#
#         validate_table_capacity(
#             restaurant,
#             serializer.validated_data["guest_count"]
#         )
#
#         reservation = Reservation.objects.create(
#             user=getattr(request.user, "profile", None),
#             status=ReservationStatus.CONFIRMED,
#             **serializer.validated_data
#         )
#
#         return Response(
#             {
#                 "id": reservation.id,
#                 "status": reservation.get_status_display(),
#                 "reservation_time": reservation.reservation_time,
#                 "guest_count": reservation.guest_count,
#             },
#             status=status.HTTP_201_CREATED
#         )

class ReservationListCreateAPIView(ListCreateAPIView):
    serializer_class = ReservationDetailSerializer
    pagination_class = LimitOffsetOf10Pagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ReservationCreateSerializer
        return ReservationDetailSerializer

    def get_queryset(self):
        profile = getattr(self.request.user, "profile", None)
        if not profile:
            return Reservation.objects.none()

        return (
            Reservation.objects
            .filter(user=profile)
            .select_related("restaurant")
            .order_by("-reservation_time")
        )

    def perform_create(self, serializer):
        restaurant_id = self.request.data["restaurant"]

        logger.info(f"restaurant id {restaurant_id}")

        restaurant = get_object_or_404(Restaurant, id=restaurant_id)

        serializer.save(
            restaurant=restaurant,
            user=getattr(self.request.user, "profile", None),
            status=ReservationStatus.CONFIRMED.value,
        )

class ReservationDetailAPIView(RetrieveAPIView):
    serializer_class = ReservationDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, "profile", None)
        if not profile:
            return Reservation.objects.none()

        return (
            Reservation.objects
            .filter(user=profile)
            .select_related("restaurant")
        )
