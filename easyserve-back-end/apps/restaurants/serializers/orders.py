from rest_framework import serializers
from apps.restaurants.models import Orders, OrderItem, MenuItem


class MenuItemNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ['name']


class OrderItemDetailSerializer(serializers.ModelSerializer):
    menu_item = MenuItemNameSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = "__all__"


class OrderItemSerializer(serializers.ModelSerializer):
    menu_item = MenuItemNameSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'menu_item',
            'created_at',
            'quantity',
            'comments',
            'price',
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemDetailSerializer(many=True, read_only=True)

    order_type = serializers.CharField(
        source='get_order_type_display'
    )

    order_status = serializers.CharField(
        source='get_order_status_display'
    )

    payment_status = serializers.CharField(
        source='get_payment_status_display'
    )

    waiter_name = serializers.SerializerMethodField()
    chef_name = serializers.SerializerMethodField()
    table_number = serializers.SerializerMethodField()

    class Meta:
        model = Orders
        fields = [
            'id',
            'user',
            'order_type',
            'order_status',
            'payment_status',
            'total_price',
            'billing_first_name',
            'billing_last_name',
            'billing_email',
            'billing_phone',
            'billing_address',
            'shipping_address',
            'ordered_date',
            'order_cancelled',
            'ordered',
            'dine_in_session',
            'accepted_by_waiter',
            'waiter_name',
            'chef_name',
            'table_number',
            'items',
        ]

    def get_waiter_name(self, obj):
        if obj.waiter:
            return obj.waiter.full_name
        return None

    def get_chef_name(self, obj):
        if obj.assigned_chef:
            return obj.assigned_chef.full_name
        return None

    def get_table_number(self, obj):
        if obj.table:
            return obj.table.table_number
        return None


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(
        many=True,
        read_only=True
    )

    order_type = serializers.CharField(
        source='get_order_type_display'
    )

    order_status = serializers.CharField(
        source='get_order_status_display'
    )

    payment_status = serializers.CharField(
        source='get_payment_status_display'
    )

    waiter_name = serializers.SerializerMethodField()
    chef_name = serializers.SerializerMethodField()
    table_number = serializers.SerializerMethodField()

    class Meta:
        model = Orders
        fields = [
            'id',
            'user',
            'order_type',
            'order_status',
            'payment_status',
            'total_price',
            'billing_first_name',
            'billing_last_name',
            'ordered_date',
            'accepted_by_waiter',
            'waiter_name',
            'chef_name',
            'table_number',
            'items',
        ]

    def get_waiter_name(self, obj):
        if obj.waiter:
            return obj.waiter.full_name
        return None

    def get_chef_name(self, obj):
        if obj.assigned_chef:
            return obj.assigned_chef.full_name
        return None

    def get_table_number(self, obj):
        if obj.table:
            return obj.table.table_number
        return None