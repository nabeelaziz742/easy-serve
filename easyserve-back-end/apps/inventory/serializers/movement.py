from rest_framework import serializers
from apps.inventory.models import StockMovementLog


class StockMovementLogSerializer(serializers.ModelSerializer):
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    item_name = serializers.ReadOnlyField(source='inventory_item.name')
    item_sku = serializers.ReadOnlyField(source='inventory_item.sku')
    unit_code = serializers.ReadOnlyField(source='inventory_item.uom.short_code')
    wastage_id = serializers.ReadOnlyField(source='wastage.id')
    logged_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StockMovementLog
        fields = [
            'id',
            'restaurant',
            'inventory_item',
            'item_name',
            'item_sku',
            'unit_code',
            'movement_type',
            'movement_type_display',
            'quantity_delta',
            'balance_after',
            'unit_cost',
            'total_value',
            'reference_note',
            'wastage',
            'wastage_id',
            'logged_by',
            'logged_by_name',
            'created_at',
        ]
        read_only_fields = fields

    def get_logged_by_name(self, obj):
        if obj.logged_by:
            prof = obj.logged_by
            full = f"{getattr(prof, 'first_name', '') or ''} {getattr(prof, 'last_name', '') or ''}".strip()
            if full:
                return full
            if getattr(prof, 'user', None):
                return getattr(prof.user, 'username', None) or getattr(prof.user, 'email', None) or "User"
        return "System"
