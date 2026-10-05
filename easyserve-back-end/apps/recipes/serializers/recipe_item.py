from decimal import Decimal
from rest_framework import serializers

from apps.inventory.models import InventoryItem, UnitOfMeasure
from apps.recipes.models import RecipeItem


class RecipeItemReadSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='inventory_item.name', read_only=True)
    item_sku = serializers.CharField(source='inventory_item.sku', read_only=True)
    inventory_uom_code = serializers.CharField(source='inventory_item.uom.short_code', read_only=True)
    uom_code = serializers.SerializerMethodField()
    current_stock = serializers.DecimalField(
        source='inventory_item.current_stock',
        max_digits=12,
        decimal_places=3,
        read_only=True
    )
    cost_per_unit = serializers.DecimalField(
        source='inventory_item.cost_per_unit',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    ingredient_cost = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = RecipeItem
        fields = [
            'id',
            'inventory_item',
            'item_name',
            'item_sku',
            'quantity_required',
            'uom',
            'uom_code',
            'inventory_uom_code',
            'current_stock',
            'cost_per_unit',
            'ingredient_cost',
        ]
        read_only_fields = ['id', 'ingredient_cost']

    def get_uom_code(self, obj):
        eff = obj.effective_uom
        return eff.short_code if eff else ""


class RecipeItemWriteSerializer(serializers.Serializer):
    inventory_item_id = serializers.IntegerField()
    quantity_required = serializers.DecimalField(max_digits=12, decimal_places=4)
    uom_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_quantity_required(self, value):
        if value <= Decimal('0.0000'):
            raise serializers.ValidationError("Quantity required must be greater than zero.")
        return value
