from rest_framework import serializers
from apps.restaurants.constants import OrderStatus


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=OrderStatus
    )
