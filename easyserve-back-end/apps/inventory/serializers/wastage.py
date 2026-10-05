from decimal import Decimal
from rest_framework import serializers
from apps.inventory.models import StockWastage
from apps.inventory.constants import WastageReason


class StockWastageSerializer(serializers.ModelSerializer):
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    item_name = serializers.ReadOnlyField(source='inventory_item.name')
    item_sku = serializers.ReadOnlyField(source='inventory_item.sku')
    unit_code = serializers.ReadOnlyField(source='inventory_item.uom.short_code')
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StockWastage
        fields = [
            'id',
            'restaurant',
            'inventory_item',
            'item_name',
            'item_sku',
            'unit_code',
            'quantity',
            'uom',
            'reason',
            'reason_display',
            'notes',
            'unit_cost',
            'total_cost',
            'wastage_date',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'restaurant',
            'unit_cost',
            'total_cost',
            'created_by',
            'created_at',
            'updated_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            prof = obj.created_by
            full = f"{getattr(prof, 'first_name', '') or ''} {getattr(prof, 'last_name', '') or ''}".strip()
            if full:
                return full
            if getattr(prof, 'user', None):
                return getattr(prof.user, 'username', None) or getattr(prof.user, 'email', None) or "User"
        return "System"


class StockWastageCreateSerializer(serializers.Serializer):
    inventory_item_id = serializers.IntegerField(required=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal('0.001'), required=True)
    uom_id = serializers.IntegerField(required=False, allow_null=True)
    reason = serializers.ChoiceField(choices=WastageReason.model_choices(), default=WastageReason.EXPIRED.value)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    wastage_date = serializers.DateField(required=False, allow_null=True)


class StockCountItemEntrySerializer(serializers.Serializer):
    inventory_item_id = serializers.IntegerField(required=True)
    physical_count = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal('0.000'), required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class StockCountSubmitSerializer(serializers.Serializer):
    items = serializers.ListField(
        child=StockCountItemEntrySerializer(),
        allow_empty=False,
        required=True
    )
    audit_notes = serializers.CharField(required=False, allow_blank=True, default='')
