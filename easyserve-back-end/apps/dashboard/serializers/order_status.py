from rest_framework import serializers
from apps.restaurants.models import Orders, OrderItem
from django.utils.timesince import timesince


class OrderStatusSerializer(serializers.ModelSerializer):
    table = serializers.SerializerMethodField()
    customer = serializers.CharField(source="user.full_name")
    status = serializers.CharField(source='get_order_status_display')
    items = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()

    class Meta:
        model = Orders
        fields = ["id", "table", "customer", "items", "status", "time"]

    @staticmethod
    def get_items(obj):
        return [f"{it.menu_item.name}" for it in obj.items.all()]

    @staticmethod
    def get_time(obj):
        return timesince(obj.updated_at) + " ago"
    def get_table(self, obj):
        return obj.table.table_number if obj.table else 1
