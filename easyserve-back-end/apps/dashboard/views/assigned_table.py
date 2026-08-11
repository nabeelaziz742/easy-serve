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

    authentication_classes = [IsAuthenticated]

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

        try:

            order = Orders.objects.get(
                id=order_id
            )

        except Orders.DoesNotExist:

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

            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )