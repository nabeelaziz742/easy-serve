from rest_framework import serializers
from apps.restaurants.models import Table, Orders, Review


class AssignedTableSerializer(serializers.ModelSerializer):
    items_name = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = [
            "id",
            "table_number",
            "table_state",
            "customer_count",
            "updated_at",
            "items_name",
        ]

    def get_items_name(self, obj):
        if obj.orders:
            items = []
            for order in obj.orders.all():
                items = [item.menu_item.name for item in order.items.all()]
            return items
        return []

class CurrentOrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    items_name = serializers.SerializerMethodField()

    class Meta:
        model = Orders
        fields = [
            "id",
            "table",
            "customer_name",
            "items_name",
            "updated_at",
            "order_status",
        ]

    def get_customer_name(self, obj):
        return obj.user.first_name + " " + obj.user.last_name

    def get_items_name(self, obj):
        return [item.menu_item.name for item in obj.items.all()]

class ChangeOrderStatusSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    items_name = serializers.SerializerMethodField()

    class Meta:
        model = Orders
        fields = [
            "id",
            "table",
            "customer_name",
            "items_name",
            "order_status",
        ]
        read_only_fields = [
            "id",
            "table",
            "customer_name",
            "items_name",
        ]

    def get_customer_name(self, obj):
        return obj.user.first_name + " " + obj.user.last_name

    def get_items_name(self, obj):
        return [item.menu_item.name for item in obj.items.all()]

class CustomerReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    table_number = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "table_number",
            "rate",
            "comment",
            "customer_name",
        ]

    def get_customer_name(self, obj):
        return obj.user.first_name + " " + obj.user.last_name

    def get_table_number(self, obj):
        return obj.order.table.table_number if obj.order.table else None

class AddReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = [
            "order",
            "user",
            "waiter",
            "rate",
            "comment",
        ]