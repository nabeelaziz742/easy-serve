from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import (
    IsAuthenticated,
    AllowAny
)

from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.restaurants.models import Orders
from apps.restaurants.services.order_access import staff_belongs_to_order_restaurant

STAFF_TYPES = ("waiter", "chef", "manager", "restaurant_owner", "super_admin")

from apps.dashboard.serializers import (
    AssignedTableSerializer,
    CurrentOrderSerializer,
    CustomerReviewSerializer,
    AddReviewSerializer,
    ChangeOrderStatusSerializer
)


# ==================================================
# ASSIGNED TABLES
# ==================================================

class MyAssignedTablesView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        assigned_tables = request.user.profile.assigned_tables

        serializer = AssignedTableSerializer(
            assigned_tables,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


# ==================================================
# CURRENT ORDERS
# ==================================================

class CurrentOrdersView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        current_orders = request.user.profile.waiter_orders

        serializer = CurrentOrderSerializer(
            current_orders,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


# ==================================================
# CHANGE ORDER STATUS
# ==================================================

class ChangeOrderStatusView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):

        order = Orders.objects.filter(id=order_id).first()

        # Only staff of the order's own restaurant may change it. This used
        # to accept any logged-in account (customers, other restaurants).
        # 404 rather than 403 so the order's existence is not revealed.
        if (
            order is None
            or getattr(request.user, "user_type", None) not in STAFF_TYPES
            or not staff_belongs_to_order_restaurant(request.user, order)
        ):

            return Response(
                {
                    "error": "Order not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ChangeOrderStatusSerializer(
            order,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# ==================================================
# CUSTOMER REVIEWS
# ==================================================

class CustomerReviews(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        reviews = request.user.profile.waiter_reviews

        serializer = CustomerReviewSerializer(
            reviews,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


# ==================================================
# ADD CUSTOMER REVIEW
# ==================================================

@extend_schema(exclude=True)
class AddCustomerReview(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = AddReviewSerializer(
            data=request.data
        )

        if serializer.is_valid():

            # A review can only be written by the customer who placed the
            # order, for the waiter who served it. The client used to choose
            # "user" and "waiter" freely, so anyone could post reviews under
            # another customer's name or rate any waiter.
            order = serializer.validated_data["order"]
            profile = getattr(request.user, "profile", None)
            if profile is None or order.user_id != profile.id:
                return Response(
                    {"order": ["You can only review your own orders."]},
                    status=status.HTTP_403_FORBIDDEN
                )

            serializer.save(user=profile, waiter=order.waiter)

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )