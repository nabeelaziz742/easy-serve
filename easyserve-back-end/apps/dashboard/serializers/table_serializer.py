from rest_framework import serializers
from apps.restaurants.constants import TableState


class TableSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    number = serializers.IntegerField()
    status = serializers.ChoiceField(
        choices=TableState.model_choices()
    )
    customers = serializers.IntegerField()
    orderItems = serializers.ListField()
    orderTime = serializers.DateTimeField(allow_null=True)
    orderId = serializers.IntegerField(allow_null=True)
    customer_name = serializers.CharField(allow_null=True)
    review = serializers.DictField(allow_null=True)

    class Meta:
        ref_name = "RestaurantTableSerializer"