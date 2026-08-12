from django.db import transaction
from django.utils.timezone import now
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from apps.userprofile.models import UserProfile, Notification
from apps.core.models.user import User
from apps.restaurants.constants import OrderStatus
from django.db.models import Sum

from apps.restaurants.constants import (
    OrderType,
    DineInSessionStatus,
    ReservationStatus,
    PaymentStatus,
    PaymentMethod,
)
from apps.restaurants.serializers import OrderSerializer, OrderDetailSerializer
from apps.restaurants.permissions import IsWaiter, IsChef, IsManager

from apps.restaurants.models import (
    Cart,
    Orders,
    OrderItem,
    MenuItem,
    DineInSession,
    Restaurant,
    Table,
    Reservation,
    PaymentDetails,
)


class OrderCheckoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user.profile
        data = request.data
        items = data.get("items", [])

        if not items:
            return Response(
                {"detail": "Items are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order_type = OrderType[data.get("order_type", "DELIVERY")].value
        except KeyError:
            return Response(
                {"detail": "Invalid order type."},
                status=status.HTTP_400_BAD_REQUEST
            )

        dine_in_session = None
        table = None

        if order_type == OrderType.DINE_IN.value:
            restaurant_id = data.get("restaurant")
            table_number = data.get("table")
            guests = data.get("guests")

            if guests is None:
                return Response(
                    {"detail": "Guest count is required for dine-in."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if guests <= 0:
                return Response(
                    {"detail": "Guests must be at least 1."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            restaurant = get_object_or_404(Restaurant, id=restaurant_id)
            table = get_object_or_404(
                Table,
                restaurant=restaurant,
                table_number=table_number
            )

            if guests > table.capacity:
                return Response(
                    {
                        "detail": f"Table capacity exceeded ({table.capacity}).",
                        "warning": True
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            dine_in_session, session_created = DineInSession.objects.get_or_create(
                restaurant=restaurant,
                table=table,
                status=DineInSessionStatus.ACTIVE.value,
                defaults={
                    "guests": guests,
                    "name": data.get("name", ""),
                    "phone": data.get("phone", ""),
                }
            )

            if session_created:
                Reservation.objects.create(
                    restaurant=restaurant,
                    user=user,
                    table=table,
                    reservation_time=now(),
                    guest_count=guests,
                    status=ReservationStatus.SEATED,
                )

        order = Orders.objects.create(
            user=user,
            order_type=order_type,
            ordered=True,
            ordered_date=now(),
            dine_in_session=dine_in_session,
            table=table,
        )

        total_price = 0

        for item in items:
            menu_item = get_object_or_404(
                MenuItem,
                id=item["menu_item"],
            )

            quantity = max(1, int(item.get("quantity", 1)))

            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                quantity=quantity,
                price=menu_item.price,
            )

            total_price += menu_item.price * quantity

        order.billing_first_name = user.first_name
        order.billing_last_name = user.last_name
        order.billing_email = request.user.email
        order.billing_phone = user.phone
        order.billing_address = data.get(
            "billing_address", "N/A"
        )
        order.shipping_address = data.get(
            "shipping_address", "N/A"
        )
        order.total_price = total_price
        order.save()

        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED
        )


class PayOrderAPIView(APIView):
    """
    Confirms payment for an order (manual/staff-confirmed flow,
    not a live payment gateway).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order = get_object_or_404(Orders, id=order_id)
        profile = request.user.profile

        is_owner = order.user_id == profile.id
        is_staff = getattr(request.user, "user_type", None) in (
            "waiter", "manager", "super_admin"
        )

        if not (is_owner or is_staff):
            return Response(
                {"detail": "You are not allowed to confirm payment for this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.payment_status == PaymentStatus.CONFIRMED.value:
            return Response(
                {"detail": "This order has already been paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.order_cancelled:
            return Response(
                {"detail": "Cannot pay for a cancelled order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        method_key = request.data.get("payment_method", "cash")
        method_value = (
            PaymentMethod.TRANSFER.value
            if method_key == "transfer"
            else PaymentMethod.CATCH_ON_DELIVERY.value
        )

        with transaction.atomic():
            PaymentDetails.objects.update_or_create(
                order=order,
                defaults={
                    "user": order.user,
                    "payment_method": method_value,
                    "payment_status": PaymentStatus.CONFIRMED.value,
                    "receipt_image": request.FILES.get("receipt_image"),
                },
            )

            order.payment_status = PaymentStatus.CONFIRMED.value
            order.save(update_fields=["payment_status"])

        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_200_OK,
        )


class OrderDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(Orders, id=order_id)
        profile = request.user.profile
        user_type = getattr(request.user, "user_type", None)

        if order.user_id != profile.id:
            allowed_staff_types = (
                "waiter",
                "chef",
                "manager",
                "restaurant_owner",
                "super_admin",
            )
            if user_type not in allowed_staff_types:
                return Response(
                    {"detail": "You are not allowed to view this order."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return Response(OrderDetailSerializer(order).data)


class WaiterOrderListAPIView(ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsWaiter]

    def get_queryset(self):
        return Orders.objects.filter(
            waiter=self.request.user.profile
        ).order_by("-created_at")

class UserOrderHistoryAPIView(ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]


    def get_queryset(self):
        return Orders.objects.filter(
            user=self.request.user.profile
        ).order_by("-created_at")

class PendingOrderListAPIView(ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsWaiter]

    def get_queryset(self):
        return Orders.objects.filter(
            accepted_by_waiter=False
        ).order_by("-created_at")


class WaiterAcceptOrderAPIView(APIView):
    permission_classes = [IsWaiter]

    def post(self, request, order_id):
        order = get_object_or_404(Orders, id=order_id)

        if order.accepted_by_waiter:
            return Response(
                {"detail": "Order has already been accepted by a waiter."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.waiter = request.user.profile
        order.accepted_by_waiter = True
        order.save()

        return Response({
            "message": "Order accepted successfully"
        })


class AssignChefAPIView(APIView):
    permission_classes = [IsWaiter]

    def post(self, request, order_id):
        order = get_object_or_404(Orders, id=order_id)

        if not order.accepted_by_waiter:
            return Response(
                {"detail": "Order must be accepted by a waiter before a chef can be assigned."},
                status=status.HTTP_400_BAD_REQUEST
            )

        chef_id = request.data.get("chef_id")

        chef = get_object_or_404(
            UserProfile,
            id=chef_id,
            user__user_type="chef"
        )

        order.assigned_chef = chef
        order.save()

        Notification.objects.create(
            profile=chef,
            message=f"New order #{order.id} assigned"
        )

        return Response({
            "message": "Chef assigned successfully"
        })


class ChefOrderListAPIView(ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsChef]

    def get_queryset(self):
        return Orders.objects.filter(
            assigned_chef=self.request.user.profile
        ).order_by("-created_at")

class ReadyOrdersAPIView(ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsWaiter]

    def get_queryset(self):
        return Orders.objects.filter(
            order_status=OrderStatus.PREPARED
        ).order_by("-created_at")


class StartPreparingAPIView(APIView):
    permission_classes = [IsChef]

    def post(self, request, order_id):
        order = get_object_or_404(
            Orders,
            id=order_id
        )

        if order.assigned_chef_id != request.user.profile.id:
            return Response(
                {"detail": "You are not the chef assigned to this order."},
                status=status.HTTP_403_FORBIDDEN
            )

        if order.order_status != OrderStatus.TO_PREPARE:
            return Response(
                {"detail": "Order is not in a state that can be started."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.order_status = OrderStatus.PREPARING
        order.save()

        return Response({
            "message": "Order is now preparing"
        })


class MarkPreparedAPIView(APIView):
    permission_classes = [IsChef]

    def post(self, request, order_id):
        order = get_object_or_404(
            Orders,
            id=order_id
        )

        if order.assigned_chef_id != request.user.profile.id:
            return Response(
                {"detail": "You are not the chef assigned to this order."},
                status=status.HTTP_403_FORBIDDEN
            )

        if order.order_status != OrderStatus.PREPARING:
            return Response(
                {"detail": "Order must be in Preparing state before it can be marked Prepared."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.order_status = OrderStatus.PREPARED
        order.save()

        if order.waiter:
            Notification.objects.create(
                profile=order.waiter,
                message=f"Order #{order.id} is ready to serve"
            )

        return Response({
            "message": "Order prepared successfully"
        })


class MarkServedAPIView(APIView):
    permission_classes = [IsWaiter]

    def post(self, request, order_id):
        order = get_object_or_404(
            Orders,
            id=order_id
        )

        if order.order_status != OrderStatus.PREPARED:
            return Response(
                {"detail": "Order must be Prepared before it can be marked Served."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.order_status = OrderStatus.SERVED
        order.save()

        return Response({
            "message": "Order served successfully"
        })


class ManagerDashboardAPIView(APIView):
    permission_classes = [IsManager]

    def get(self, request):

        total_revenue = Orders.objects.filter(
            order_status=OrderStatus.SERVED
        ).aggregate(
            revenue=Sum("total_price")
        )["revenue"] or 0

        data = {
            "total_orders": Orders.objects.count(),

            "pending_orders": Orders.objects.filter(
                order_status=OrderStatus.TO_PREPARE
            ).count(),

            "preparing_orders": Orders.objects.filter(
                order_status=OrderStatus.PREPARING
            ).count(),

            "prepared_orders": Orders.objects.filter(
                order_status=OrderStatus.PREPARED
            ).count(),

            "served_orders": Orders.objects.filter(
                order_status=OrderStatus.SERVED
            ).count(),

            "total_waiters": User.objects.filter(
                user_type="waiter"
            ).count(),

            "total_chefs": User.objects.filter(
                user_type="chef"
            ).count(),

            "total_revenue": total_revenue,
        }

        return Response(data)