from rest_framework import serializers
from apps.restaurants.constants import TableState

# The QR carries the table's secret key, so only the people who print it get it.
QR_VIEWER_TYPES = ("manager", "restaurant_owner", "super_admin")


class TableSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    number = serializers.IntegerField()
    restaurant = serializers.CharField()
    qrCode = serializers.SerializerMethodField()
    status = serializers.ChoiceField(
        choices=TableState.model_choices()
    )
    customers = serializers.IntegerField()
    orderItems = serializers.ListField()
    orderTime = serializers.DateTimeField(allow_null=True)
    orderId = serializers.IntegerField(allow_null=True)
    customer_name = serializers.CharField(allow_null=True)
    review = serializers.DictField(allow_null=True)

    def get_qrCode(self, table):
        request = self.context.get("request")
        if not table["qrCode"] or getattr(request.user, "user_type", None) not in QR_VIEWER_TYPES:
            return None
        return request.build_absolute_uri(table["qrCode"])

    class Meta:
        ref_name = "RestaurantTableSerializer"