from rest_framework import serializers


class PurchasesSummarySerializer(serializers.Serializer):
    total_purchase_value = serializers.CharField()
    this_month_value = serializers.CharField()
    this_week_value = serializers.CharField()
    draft_count = serializers.IntegerField()
    received_count = serializers.IntegerField()
    suppliers_count = serializers.IntegerField()
    recent_purchases = serializers.ListField()
