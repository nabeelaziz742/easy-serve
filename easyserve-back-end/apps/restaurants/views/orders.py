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
from django.db.models import Sum, Q, Count

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
            return Response({"detail": "Items are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order_type = OrderType[data.get("order_type", "DELIVERY")].value
        except KeyError:
            return Response({"detail": "Invalid order type."}, status=status.HTTP_400_BAD_REQUEST)

        dine_in_session = None
        table = None

        if order_type == OrderType.DINE_IN.value:
            restaurant_id = data.get("restaurant")
            table_number = data.get("table")
            guests = data.get("guests")

            if guests is None:
                return Response({"detail": "Guest count is required for dine-in."}, status=status.HTTP_400_BAD_REQUEST)
            if guests <= 0:
                return Response({"detail": "Guests must be at least 1."}, status=status.HTTP_400_BAD_REQUEST)

            restaurant = get_object_or_404(Restaurant, id=restaurant_id)
            table = get_object_or_404(Table, restaurant=restaurant, table_number=table_number)

            if guests > table.capacity:
                return Response({"detail": f"Table capacity exceeded ({table.capacity}).", "warning": True}, status=status.HTTP_400_BAD_REQUEST)

            dine_in_session, session_created = DineInSession.objects.get_or_create(
                restaurant=restaurant,
                table=table,
                status=DineInSessionStatus.ACTIVE.value,
                defaults={"guests": guests, "name": data.get("name", ""), "phone": data.get("phone", "")},
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
            menu_item = get_object_or_404(MenuItem, id=item["menu_item"])
            if order_type == OrderType.DINE_IN.value and menu_item.menu.restaurant_id != restaurant.id:
                return Response({"detail": "Menu item does not belong to the selected restaurant."}, status=status.HTTP_400_BAD_REQUEST)

            quantity = max(1, int(item.get("quantity", 1)))
            OrderItem.objects.create(order=order, menu_item=menu_item, quantity=quantity, price=menu_item.price)
            total_price += menu_item.price * quantity

        order.billing_first_name = user.first_name
        order.billing_last_name = user.last_name
        order.billing_email = request.user.email
        order.billing_phone = user.phone
        order.billing_address = data.get("billing_address", "N/A")
        order.shipping_address = data.get("shipping_address", "N/A")
        order.total_price = total_price
        order.save()

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)


class PayOrderAPIView(APIView):
    """Record a payment request without bypassing the restaurant cash-settlement workflow."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(Orders.objects.select_for_update(), id=order_id)
        profile = request.user.profile
        is_owner = order.user_id == profile.id
        is_staff = getattr(request.user, "user_type", None) in ("waiter", "manager", "super_admin")

        if not (is_owner or is_staff):
            return Response({"detail": "You are not allowed to confirm payment for this order."}, status=status.HTTP_403_FORBIDDEN)
        if order.payment_status == PaymentStatus.CONFIRMED.value:
            return Response({"detail": "This order has already been paid."}, status=status.HTTP_400_BAD_REQUEST)
        if order.order_cancelled:
            return Response({"detail": "Cannot pay for a cancelled order."}, status=status.HTTP_400_BAD_REQUEST)

        method_key = request.data.get("payment_method", "cash")

        # A customer (not staff) can only ever submit a cash payment request,
        # which stays pending until restaurant staff confirms it further down
        # this method. They can never self-confirm a "transfer" payment.
        if is_owner and not is_staff:
            if method_key != "cash":
                return Response(
                    {"detail": "Customer payment requests are currently supported for cash only."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            PaymentDetails.objects.update_or_create(
                order=order,
                defaults={
                    "user": order.user,
                    "payment_method": PaymentMethod.CATCH_ON_DELIVERY.value,
                    "payment_status": PaymentStatus.PENDING.value,
                    "receipt_image": request.FILES.get("receipt_image"),
                },
            )
            order.payment_status = PaymentStatus.PENDING.value
            order.save(update_fields=["payment_status", "updated_at"])
            return Response(
                {
                    "message": "Cash payment request submitted. Waiting for restaurant confirmation.",
                    "payment_pending": True,
                },
                status=status.HTTP_200_OK,
            )

        # Cash must NEVER be directly confirmed here. It enters the existing
        # waiter-receipt -> manager-settlement workflow so staff cannot
        # accidentally mark an uncollected cash order as paid.
        if method_key != "transfer":
            PaymentDetails.objects.update_or_create(
                order=order,
                defaults={
                    "user": order.user,
                    "payment_method": PaymentMethod.CATCH_ON_DELIVERY.value,
                    "payment_status": PaymentStatus.PENDING.value,
                    "receipt_image": request.FILES.get("receipt_image"),
                },
            )
            order.payment_status = PaymentStatus.PENDING.value
            order.save(update_fields=["payment_status", "updated_at"])
            return Response(
                {
                    "message": "Cash payment requested. Waiter must receive the cash and manager must settle it.",
                    "payment_status": PaymentStatus.PENDING.value,
                    "payment_method": PaymentMethod.CATCH_ON_DELIVERY.value,
                    "order": OrderDetailSerializer(order).data,
                },
                status=status.HTTP_200_OK,
            )

        # Transfer confirmation remains a manual/staff-confirmed flow.
        PaymentDetails.objects.update_or_create(
            order=order,
            defaults={
                "user": order.user,
                "payment_method": PaymentMethod.TRANSFER.value,
                "payment_status": PaymentStatus.CONFIRMED.value,
                "receipt_image": request.FILES.get("receipt_image"),
            },
        )
        order.payment_status = PaymentStatus.CONFIRMED.value
        order.save(update_fields=["payment_status", "updated_at"])

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_200_OK)


class OrderDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(Orders, id=order_id)
        profile = request.user.profile
        user_type = getattr(request.user, "user_type", None)

        if order.user_id != profile.id:
            # Super admins can view any order.
            if user_type == "super_admin":
                return Response(OrderDetailSerializer(order).data)

            allowed_staff_types = ("waiter", "chef", "manager", "restaurant_owner")
            if user_type not in allowed_staff_types:
                return Response({"detail": "You are not allowed to view this order."}, status=status.HTTP_403_FORBIDDEN)

            # Staff/owners must belong to the same restaurant as the order.
            # Without this, any waiter/chef/manager at ANY restaurant could
            # view another restaurant's order (customer name, phone,
            # address, billing) just by guessing/incrementing the order id.
            order_restaurant_id = (
                order.table.restaurant_id if order.table_id
                else order.items.filter(menu_item__menu__restaurant__isnull=False)
                .values_list("menu_item__menu__restaurant_id", flat=True)
                .first()
            )

            if order_restaurant_id is None:
                return Response({"detail": "You are not allowed to view this order."}, status=status.HTTP_403_FORBIDDEN)

            if user_type == "restaurant_owner":
                has_access = profile.owned_restaurants.filter(id=order_restaurant_id).exists()
            else:
                has_access = profile.restaurant_id == order_restaurant_id

            if not has_access:
                return Response({"detail": "This order does not belong to your restaurant."}, status=status.HTTP_403_FORBIDDEN)

        return Response(OrderDetailSerializer(order).data)


class WaiterOrderListAPIView(ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsWaiter]

    def get_queryset(self):
        return Orders.objects.filter(waiter=self.request.user.profile).order_by("-created_at")


class UserOrderHistoryAPIView(ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Orders.objects.filter(user=self.request.user.profile).order_by("-created_at")


class PendingOrderListAPIView(ListAPIView):
    """Orders genuinely waiting for waiter acceptance."""

    serializer_class = OrderSerializer
    permission_classes = [IsWaiter]

    def get_queryset(self):
        profile = self.request.user.profile
        restaurant = profile.restaurant
        if restaurant is None:
            return Orders.objects.none()
        return Orders.objects.filter(
            accepted_by_waiter=False,
            order_status=OrderStatus.TO_PREPARE,
        ).filter(
            Q(table__restaurant=restaurant) | Q(items__menu_item__menu__restaurant=restaurant)
        ).distinct().order_by("-created_at")


class WaiterAcceptOrderAPIView(APIView):
    """Accept an order and automatically assign the least-busy active chef."""

    permission_classes = [IsWaiter]

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(Orders.objects.select_for_update(), id=order_id)
        waiter = request.user.profile
        restaurant = waiter.restaurant

        if restaurant is None:
            return Response(
                {"detail": "Your waiter account is not assigned to a restaurant."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        belongs_to_restaurant = (
            (order.table_id and order.table.restaurant_id == restaurant.id)
            or order.items.filter(menu_item__menu__restaurant=restaurant).exists()
        )
        if not belongs_to_restaurant:
            return Response(
                {"detail": "This order does not belong to your restaurant."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.accepted_by_waiter:
            return Response(
                {"detail": "Order has already been accepted by a waiter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.order_status != OrderStatus.TO_PREPARE:
            return Response(
                {"detail": "Only new orders can be accepted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chef = (
            UserProfile.objects
            .filter(
                user__user_type="chef",
                restaurant=restaurant,
                user__is_active=True,
            )
            .annotate(
                active_order_count=Count(
                    "chef_orders",
                    filter=Q(
                        chef_orders__order_status__in=(
                            OrderStatus.TO_PREPARE,
                            OrderStatus.PREPARING,
                        )
                    ),
                )
            )
            .order_by("active_order_count", "id")
            .first()
        )

        if chef is None:
            return Response(
                {"detail": "No active chef is available for this restaurant."},
                status=status.HTTP_409_CONFLICT,
            )

        order.waiter = waiter
        order.accepted_by_waiter = True
        order.assigned_chef = chef
        order.save(
            update_fields=["waiter", "accepted_by_waiter", "assigned_chef", "updated_at"]
        )

        Notification.objects.create(
            profile=chef,
            message=f"New order #{order.id} assigned to you",
        )

        return Response(
            {
                "message": "Order accepted and assigned to chef successfully.",
                "chef_id": chef.id,
                "order_id": order.id,
            },
            status=status.HTTP_200_OK,
        )


class AssignChefAPIView(APIView):
    permission_classes = [IsWaiter]

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(Orders.objects.select_for_update(), id=order_id)
        profile = request.user.profile
        restaurant = profile.restaurant

        if restaurant is None or not (
            (order.table_id and order.table.restaurant_id == restaurant.id)
            or order.items.filter(menu_item__menu__restaurant=restaurant).exists()
        ):
            return Response({"detail": "You are not allowed to manage this order."}, status=status.HTTP_403_FORBIDDEN)
        if not order.accepted_by_waiter:
            return Response({"detail": "Order must be accepted by a waiter before a chef can be assigned."}, status=status.HTTP_400_BAD_REQUEST)

        chef_id = request.data.get("chef_id")
        chef = get_object_or_404(UserProfile, id=chef_id, user__user_type="chef", restaurant=restaurant)
        if order.assigned_chef_id == chef.id:
            return Response({"message": "Chef is already assigned to this order."}, status=status.HTTP_200_OK)

        order.assigned_chef = chef
        order.save(update_fields=["assigned_chef", "updated_at"])
        Notification.objects.create(profile=chef, message=f"New order #{order.id} assigned")
        return Response({"message": "Chef assigned successfully"})


class ChefOrderListAPIView(ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsChef]

    def get_queryset(self):
        return Orders.objects.filter(assigned_chef=self.request.user.profile).order_by("-created_at")


class ReadyOrdersAPIView(ListAPIView):
    """Return prepared orders that the waiter can actually serve.

    The waiter assignment is the primary ownership signal. Restaurant
    matching remains as a fallback so an order that was prepared before
    waiter assignment (or whose legacy waiter link is missing) is still
    visible to the correct restaurant waiter.
    """

    serializer_class = OrderSerializer
    permission_classes = [IsWaiter]

    def get_queryset(self):
        profile = self.request.user.profile
        restaurant_id = profile.restaurant_id

        if restaurant_id is None:
            return Orders.objects.filter(
                order_status=OrderStatus.PREPARED,
                waiter=profile,
            ).order_by("-created_at")

        return (
            Orders.objects
            .filter(order_status=OrderStatus.PREPARED)
            .filter(
                Q(waiter=profile)
                | Q(table__restaurant_id=restaurant_id)
                | Q(items__menu_item__menu__restaurant_id=restaurant_id)
            )
            .distinct()
            .order_by("-created_at")
        )


class StartPreparingAPIView(APIView):
    permission_classes = [IsChef]

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(Orders.objects.select_for_update(), id=order_id)
        chef_profile = request.user.profile
        if order.assigned_chef_id != chef_profile.id:
            return Response({"detail": "You are not the chef assigned to this order."}, status=status.HTTP_403_FORBIDDEN)
        if chef_profile.restaurant_id and order.table_id and order.table.restaurant_id != chef_profile.restaurant_id:
            return Response({"detail": "This order does not belong to your restaurant."}, status=status.HTTP_403_FORBIDDEN)
        if order.order_status != OrderStatus.TO_PREPARE:
            return Response({"detail": "Order is not in a state that can be started."}, status=status.HTTP_400_BAD_REQUEST)
        order.order_status = OrderStatus.PREPARING
        order.save(update_fields=["order_status", "updated_at"])
        return Response({"message": "Order is now preparing"})


class MarkPreparedAPIView(APIView):
    permission_classes = [IsChef]

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(Orders.objects.select_for_update(), id=order_id)
        chef_profile = request.user.profile
        if order.assigned_chef_id != chef_profile.id:
            return Response({"detail": "You are not the chef assigned to this order."}, status=status.HTTP_403_FORBIDDEN)
        if chef_profile.restaurant_id and order.table_id and order.table.restaurant_id != chef_profile.restaurant_id:
            return Response({"detail": "This order does not belong to your restaurant."}, status=status.HTTP_403_FORBIDDEN)
        if order.order_status != OrderStatus.PREPARING:
            return Response({"detail": "Order must be in Preparing state before it can be marked Prepared."}, status=status.HTTP_400_BAD_REQUEST)
        order.order_status = OrderStatus.PREPARED
        order.save(update_fields=["order_status", "updated_at"])
        if order.waiter:
            Notification.objects.create(profile=order.waiter, message=f"Order #{order.id} is ready to serve")
        return Response({"message": "Order prepared successfully"})


class MarkServedAPIView(APIView):
    """Mark a prepared restaurant order as served and repair stale waiter assignment."""

    permission_classes = [IsWaiter]

    @transaction.atomic
    def post(self, request, order_id):
        order = get_object_or_404(Orders.objects.select_for_update(), id=order_id)
        waiter = request.user.profile

        if waiter.restaurant_id is None:
            return Response(
                {"detail": "Your waiter account is not assigned to a restaurant."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        belongs_to_restaurant = (
            (order.table_id and order.table.restaurant_id == waiter.restaurant_id)
            or order.items.filter(menu_item__menu__restaurant_id=waiter.restaurant_id).exists()
        )
        if not belongs_to_restaurant:
            return Response(
                {"detail": "This order does not belong to your restaurant."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.order_status != OrderStatus.PREPARED:
            return Response(
                {"detail": "Order must be Prepared before it can be marked Served."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        update_fields = ["order_status", "updated_at"]
        if order.waiter_id != waiter.id:
            order.waiter = waiter
            update_fields.append("waiter")

        order.order_status = OrderStatus.SERVED
        order.save(update_fields=update_fields)

        return Response({"message": "Order served successfully"}, status=status.HTTP_200_OK)


class ManagerDashboardAPIView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        profile = request.user.profile
        if request.user.user_type == "restaurant_owner":
            restaurant_ids = profile.owned_restaurants.values_list("id", flat=True)
        else:
            if not profile.restaurant:
                return Response({"total_orders": 0, "pending_orders": 0, "preparing_orders": 0, "prepared_orders": 0, "served_orders": 0, "total_waiters": 0, "total_chefs": 0, "total_revenue": 0})
            restaurant_ids = [profile.restaurant_id]

        restaurant_orders = Orders.objects.filter(
            Q(table__restaurant_id__in=restaurant_ids) | Q(items__menu_item__menu__restaurant_id__in=restaurant_ids)
        ).distinct()
        total_revenue = restaurant_orders.filter(
            order_status=OrderStatus.SERVED,
            payment_status=PaymentStatus.CONFIRMED.value,
        ).aggregate(revenue=Sum("total_price"))["revenue"] or 0

        data = {
            "total_orders": restaurant_orders.count(),
            "pending_orders": restaurant_orders.filter(order_status=OrderStatus.TO_PREPARE).count(),
            "preparing_orders": restaurant_orders.filter(order_status=OrderStatus.PREPARING).count(),
            "prepared_orders": restaurant_orders.filter(order_status=OrderStatus.PREPARED).count(),
            "served_orders": restaurant_orders.filter(order_status=OrderStatus.SERVED).count(),
            "total_waiters": User.objects.filter(user_type="waiter", profile__restaurant_id__in=restaurant_ids).count(),
            "total_chefs": User.objects.filter(user_type="chef", profile__restaurant_id__in=restaurant_ids).count(),
            "total_revenue": total_revenue,
        }
        return Response(data)
