from decimal import Decimal
from rest_framework import serializers

from apps.restaurants.models import MenuItem
from apps.inventory.models import InventoryItem, UnitOfMeasure
from apps.recipes.models import Recipe, RecipeItem
from apps.recipes.serializers.recipe_item import (
    RecipeItemReadSerializer,
    RecipeItemWriteSerializer,
)


class RecipeListSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source='menu_item.name', read_only=True)
    menu_item_price = serializers.DecimalField(
        source='menu_item.price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    category_name = serializers.CharField(source='menu_item.category.name', read_only=True, default='')
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    cost_per_serving = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    food_cost_percentage = serializers.DecimalField(max_digits=6, decimal_places=1, read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = [
            'id',
            'menu_item',
            'menu_item_name',
            'menu_item_price',
            'category_name',
            'yield_servings',
            'is_active',
            'items_count',
            'total_cost',
            'cost_per_serving',
            'food_cost_percentage',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_items_count(self, obj):
        return obj.items.count()


class RecipeDetailSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source='menu_item.name', read_only=True)
    menu_item_price = serializers.DecimalField(
        source='menu_item.price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    menu_item_description = serializers.CharField(source='menu_item.description', read_only=True, default='')
    category_name = serializers.CharField(source='menu_item.category.name', read_only=True, default='')
    items = RecipeItemReadSerializer(many=True, read_only=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    cost_per_serving = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    food_cost_percentage = serializers.DecimalField(max_digits=6, decimal_places=1, read_only=True)

    class Meta:
        model = Recipe
        fields = [
            'id',
            'menu_item',
            'menu_item_name',
            'menu_item_price',
            'menu_item_description',
            'category_name',
            'yield_servings',
            'instructions',
            'is_active',
            'items',
            'total_cost',
            'cost_per_serving',
            'food_cost_percentage',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class RecipeCreateUpdateSerializer(serializers.ModelSerializer):
    menu_item_id = serializers.IntegerField(write_only=True, required=False)
    items = RecipeItemWriteSerializer(many=True, write_only=True)

    class Meta:
        model = Recipe
        fields = [
            'id',
            'menu_item_id',
            'yield_servings',
            'instructions',
            'is_active',
            'items',
        ]
        read_only_fields = ['id']

    def validate_menu_item_id(self, value):
        restaurant = self.context.get('restaurant')
        if not restaurant:
            raise serializers.ValidationError("No active restaurant context.")

        try:
            menu_item = MenuItem.objects.get(id=value, menu__restaurant=restaurant)
        except MenuItem.DoesNotExist:
            raise serializers.ValidationError("Menu item not found for this restaurant.")

        # If creating new, ensure no duplicate recipe exists
        if not self.instance:
            if Recipe.objects.filter(restaurant=restaurant, menu_item=menu_item).exists():
                raise serializers.ValidationError(f"A recipe already exists for '{menu_item.name}'.")

        return menu_item

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one ingredient is required.")

        restaurant = self.context.get('restaurant')
        item_ids = [entry['inventory_item_id'] for entry in value]

        if len(item_ids) != len(set(item_ids)):
            raise serializers.ValidationError("Duplicate inventory items detected in recipe lines.")

        items = InventoryItem.objects.filter(id__in=item_ids, restaurant=restaurant, is_active=True).select_related('uom')
        found_map = {itm.id: itm for itm in items}

        validated_items = []
        for entry in value:
            itm_id = entry['inventory_item_id']
            if itm_id not in found_map:
                raise serializers.ValidationError(f"Inventory item ID {itm_id} is invalid or inactive for this restaurant.")

            inv_item = found_map[itm_id]
            uom_id = entry.get('uom_id')
            uom_obj = None
            if uom_id:
                try:
                    uom_obj = UnitOfMeasure.objects.get(id=uom_id)
                except UnitOfMeasure.DoesNotExist:
                    raise serializers.ValidationError(f"Unit of measure ID {uom_id} not found.")

            validated_items.append({
                'inventory_item': inv_item,
                'quantity_required': entry['quantity_required'],
                'uom': uom_obj,
            })

        return validated_items
