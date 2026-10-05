from decimal import Decimal
from rest_framework import serializers
from apps.inventory.constants import StockAdjustmentReason


class StockAdjustmentRequestSerializer(serializers.Serializer):
    inventory_item_id = serializers.IntegerField(required=True)
    new_quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        min_value=Decimal('0.000'),
        required=False,
        allow_null=True
    )
    quantity_delta = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        required=False,
        allow_null=True
    )
    reason = serializers.ChoiceField(
        choices=StockAdjustmentReason.model_choices(),
        default=StockAdjustmentReason.PHYSICAL_AUDIT.value
    )
    custom_reason = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        if attrs.get('new_quantity') is None and attrs.get('quantity_delta') is None:
            raise serializers.ValidationError("Either 'new_quantity' or 'quantity_delta' must be provided.")
        return attrs

    def get_effective_reason_text(self):
        custom = self.validated_data.get('custom_reason')
        if custom and custom.strip():
            return custom.strip()
        reason_val = self.validated_data.get('reason', StockAdjustmentReason.PHYSICAL_AUDIT.value)
        return dict(StockAdjustmentReason.model_choices()).get(reason_val, "Manual Stock Adjustment")
