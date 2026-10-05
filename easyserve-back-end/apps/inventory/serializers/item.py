from rest_framework import serializers
from apps.inventory.models import InventoryItem, InventoryCategory, UnitOfMeasure
from apps.inventory.serializers.movement import StockMovementLogSerializer


class InventoryItemSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    uom_name = serializers.ReadOnlyField(source='uom.name')
    uom_code = serializers.ReadOnlyField(source='uom.short_code')
    stock_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    stock_status = serializers.CharField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            'id',
            'restaurant',
            'category',
            'category_name',
            'name',
            'sku',
            'uom',
            'uom_name',
            'uom_code',
            'current_stock',
            'min_reorder_level',
            'cost_per_unit',
            'stock_value',
            'stock_status',
            'is_low_stock',
            'is_out_of_stock',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'restaurant',
            'stock_value',
            'stock_status',
            'is_low_stock',
            'is_out_of_stock',
            'created_at',
            'updated_at',
        ]

    def validate_current_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Opening stock cannot be negative.")
        return value

    def validate_min_reorder_level(self, value):
        if value < 0:
            raise serializers.ValidationError("Minimum reorder level cannot be negative.")
        return value

    def validate_cost_per_unit(self, value):
        if value < 0:
            raise serializers.ValidationError("Cost per unit cannot be negative.")
        return value

    def validate(self, attrs):
        restaurant = self.context.get('restaurant')
        category = attrs.get('category')
        uom = attrs.get('uom')

        if category and restaurant and category.restaurant_id != restaurant.id:
            raise serializers.ValidationError({"category": "Selected category does not belong to your restaurant."})

        if uom and restaurant and uom.restaurant_id and uom.restaurant_id != restaurant.id:
            raise serializers.ValidationError({"uom": "Selected unit of measure does not belong to your restaurant."})

        return attrs


class InventoryItemDetailSerializer(InventoryItemSerializer):
    recent_movements = serializers.SerializerMethodField()

    class Meta(InventoryItemSerializer.Meta):
        fields = InventoryItemSerializer.Meta.fields + ['recent_movements']

    def get_recent_movements(self, obj):
        qs = obj.movement_logs.select_related('logged_by__user').order_by('-created_at')[:15]
        return StockMovementLogSerializer(qs, many=True).data
