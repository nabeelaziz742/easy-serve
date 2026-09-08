from rest_framework import serializers
from apps.restaurants.constants import OrderStatus


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.CharField()

    def validate_status(self, value):
        if isinstance(value, int):
            if value in OrderStatus.values:
                return value
        val_str = str(value).strip()
        if val_str.isdigit():
            int_val = int(val_str)
            if int_val in OrderStatus.values:
                return int_val

        for choice_val, choice_label in OrderStatus.choices:
            if val_str.lower() == choice_label.lower():
                return choice_val
        for member in OrderStatus:
            if val_str.lower() == member.name.lower():
                return member.value

        raise serializers.ValidationError(
            f"Invalid status '{value}'. Must be one of {[c[1] for c in OrderStatus.choices]} or {OrderStatus.values}"
        )

