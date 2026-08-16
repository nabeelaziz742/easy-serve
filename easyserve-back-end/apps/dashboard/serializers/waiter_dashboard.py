from rest_framework import serializers
from apps.restaurants.models import Table, Orders, OrderItem, Review
from apps.restaurants.constants import OrderStatus, PaymentStatus, TableState
from apps.userprofile.models import UserProfile


class OrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="menu_item.name")

    class Meta:
        model = OrderItem
        fields = ["item_name", "quantity", "price", "comments"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Orders
        fields = ["id", "order_status", "created_at", "items"]


class WaiterTableSerializer(serializers.ModelSerializer):
    number = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    customers = serializers.IntegerField(source="customer_count")
    orderItems = serializers.SerializerMethodField()
    orderTime = serializers.SerializerMethodField()
    orderId = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    review = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = [
            "id", "number", "status", "customers",
            "orderItems", "orderTime", "orderId", "customer_name", "review",
        ]

    def get_number(self, obj):
        return obj.table_number

    def _latest_order(self, obj):
        return obj.orders.order_by("-created_at").first()

    def _effective_status(self, obj):
        order = self._latest_order(obj)
        if not order:
            return obj.get_table_state_display().upper().replace(" ", "_")

        if order.order_status == OrderStatus.SERVED.value:
            if order.payment_status == PaymentStatus.CONFIRMED.value:
                return TableState.EMPTY.name
            return TableState.PAYMENT_PENDING.name

        return order.table.get_table_state_display().upper().replace(" ", "_")

    def get_status(self, obj):
        return self._effective_status(obj)

    def get_customers(self, obj):
        return 0 if self._effective_status(obj) == TableState.EMPTY.name else obj.customer_count

    def get_orderItems(self, obj):
        last_order = self._latest_order(obj)
        if not last_order or self._effective_status(obj) == TableState.EMPTY.name:
            return []
        return OrderItemSerializer(last_order.items.all(), many=True).data

    def get_orderTime(self, obj):
        last_order = self._latest_order(obj)
        return last_order.created_at if last_order else None

    def get_orderId(self, obj):
        last_order = self._latest_order(obj)
        return last_order.id if last_order else None

    def get_customer_name(self, obj):
        last_order = self._latest_order(obj)
        return last_order.user.full_name if last_order else ""

    def get_review(self, obj):
        last_order = self._latest_order(obj)
        if not last_order:
            return None

        if hasattr(last_order, "review"):
            review = last_order.review
            return {
                "rate": review.rate,
                "comment": review.comment,
                "created_by": review.created_by,
                "created_at": review.created_at,
            }

        return None


class TableSerializer(serializers.ModelSerializer):
    number = serializers.CharField(source="table_number")
    status = serializers.CharField(source="table_state")
    capacity = serializers.CharField(source="customer_count")
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return obj.__str__()

    class Meta:
        model = Table
        fields = ["id", "number", "name", "status", "capacity"]


class WaiterDashboardSerializer(serializers.Serializer):
    user = serializers.DictField()
    stats = serializers.DictField()
    tables = TableSerializer(many=True)


class WaiterUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="full_name")
    waiter_id = serializers.CharField(source="profile_id")
    profile_image = serializers.SerializerMethodField()
    role = serializers.CharField(source="user.user_type")

    class Meta:
        model = UserProfile
        fields = ["name", "waiter_id", "profile_image", "shift_start", "shift_end", "role"]

    def get_profile_image(self, obj):
        request = self.context.get("request")
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return request.build_absolute_uri("/media/profiles/default_profile.png")


class ReviewListSerializer(serializers.ModelSerializer):
    table_number = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source="order.user.full_name")

    class Meta:
        model = Review
        fields = ["id", "table_number", "customer_name", "rate", "comment", "created_at"]

    def get_table_number(self, obj):
        return obj.order.table.table_number if obj.order.table else 1
