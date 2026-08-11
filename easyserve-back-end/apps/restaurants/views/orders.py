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
    ReservationStatus
)
from apps.restaurants.serializers import OrderSerializer, OrderDetailSerializer

from apps.restaurants.models import (
    Cart,
    Orders,
    OrderItem,
    MenuItem,
    DineInSession,
    Restaurant,
    Table,
    Reservation,
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

        # ===============================
        # 🟠 DINE-IN VALIDATION FIRST
        # ===============================
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

            dine_in_session, _ = DineInSession.objects.get_or_create(
                restaurant=restaurant,
                table=table,
                status=DineInSessionStatus.ACTIVE.value,
                defaults={
                    "guests": guests,
                    "name": data.get("name", ""),
                    "phone": data.get("phone", ""),
                }
            )

            # 📅 Create reservation if not exists
            Reservation.objects.create(
                restaurant=restaurant,
                user=user,
                table=table,
                reservation_time=now(),
                guest_count=guests,
                status=ReservationStatus.SEATED,
            )

        # ===============================
        # 🟢 CREATE ORDER (SAFE)
        # ===============================
        order = Orders.objects.create(
            user=user,
            order_type=order_type,
            ordered=True,
            ordered_date=now(),
            dine_in_session=dine_in_session,
            table=table,
        )

        # ===============================
        # 🧾 ADD ITEMS
        # ===============================
        total_price = 0

        for item in items:
            menu_item = get_object_or_404(
                MenuItem,
                id=item["menu_item"],
                # restaurant=dine_in_session.restaurant if dine_in_session else None
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

class OrderCheckoutAPIViewOld(APIView):
    """
    Convert the current user's cart into an order.
    Supports both dine-in and online orders.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        user_profile = request.user.profile

        try:
            cart = Cart.objects.get(user=user_profile)
        except Cart.DoesNotExist:
            return Response(
                {"detail": "Cart not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if not cart.cart_items.exists():
            return Response(
                {"detail": "Cart is empty."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order_type = request.data.get("order_type", "DINE_IN")

        # Base order data
        order_data = {
            "user": user_profile,
            "ordered_date": now(),
            "order_type": order_type,
            "ordered": True,
            "payment_status": "Pending",
            "total_price": cart.total_price,
        }

        # Dine-in fields
        if order_type == "DINE_IN":
            order_data["table_id"] = request.data.get("table")
            order_data["waiter_id"] = request.data.get("waiter")

        # Online fields
        else:
            order_data["billing_first_name"] = request.data.get("billing_first_name")
            order_data["billing_last_name"] = request.data.get("billing_last_name")
            order_data["billing_email"] = request.data.get("billing_email")
            order_data["billing_phone"] = request.data.get("billing_phone")
            order_data["billing_address"] = request.data.get("billing_address")
            order_data["shipping_address"] = request.data.get("shipping_address")

        # Create order
        order = Orders.objects.create(**order_data)

        # Copy cart items → order items
        for cart_item in cart.cart_items.all():
            order_item = OrderItem.objects.create(
                menu_item=cart_item.menu_item,
                quantity=cart_item.quantity,
                comments=cart_item.comments,
                price=cart_item.price,
            )
            order.items.add(order_item)

        order.save()

        # Empty cart
        cart.cart_items.all().delete()
        cart.update_total_price()

        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED
        )

class WaiterOrderListAPIView(ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Orders.objects.filter(
            accepted_by_waiter=False
        ).order_by("-created_at")


class WaiterAcceptOrderAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order = get_object_or_404(Orders, id=order_id)

        order.waiter = request.user.profile
        order.accepted_by_waiter = True
        order.save()

        return Response({
            "message": "Order accepted successfully"
        })


class AssignChefAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order = get_object_or_404(Orders, id=order_id)

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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Orders.objects.filter(
            assigned_chef=self.request.user.profile
        ).order_by("-created_at")

class ReadyOrdersAPIView(ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Orders.objects.filter(
            order_status=OrderStatus.PREPARED
        ).order_by("-created_at")


class StartPreparingAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order = get_object_or_404(
            Orders,
            id=order_id
        )

        order.order_status = OrderStatus.PREPARING
        order.save()

        return Response({
            "message": "Order is now preparing"
        })


class MarkPreparedAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order = get_object_or_404(
            Orders,
            id=order_id
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
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order = get_object_or_404(
            Orders,
            id=order_id
        )

        order.order_status = OrderStatus.SERVED
        order.save()

        return Response({
            "message": "Order served successfully"
        })


class ManagerDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

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