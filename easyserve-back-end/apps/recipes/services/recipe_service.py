from decimal import Decimal
from django.db import transaction
from django.db.models import Avg, Q, Count, F
from rest_framework.exceptions import ValidationError

from apps.inventory.services import StockService
from apps.inventory.models import InventoryItem
from apps.restaurants.models import MenuItem
from apps.recipes.models import Recipe, RecipeItem
from apps.recipes.services.uom_converter import UOMConverter


class RecipeService:
    @staticmethod
    def resolve_user_restaurant(user, explicit_restaurant_id=None):
        return StockService.resolve_user_restaurant(user, explicit_restaurant_id)

    @staticmethod
    @transaction.atomic
    def create_recipe(restaurant, user_profile, validated_data, items_data):
        """
        Creates a new Recipe with Bill of Materials line items.
        """
        menu_item = validated_data.get('menu_item')
        if not menu_item:
            raise ValidationError("A valid menu item is required.")

        # Ensure menu item belongs to this restaurant
        menu_restaurant = getattr(menu_item.menu, 'restaurant', None)
        if not menu_restaurant or menu_restaurant.id != restaurant.id:
            raise ValidationError("The selected menu item does not belong to your restaurant.")

        if Recipe.objects.filter(restaurant=restaurant, menu_item=menu_item).exists():
            raise ValidationError(f"A recipe already exists for '{menu_item.name}'.")

        if not items_data:
            raise ValidationError("At least one recipe ingredient is required.")

        yield_servings = Decimal(str(validated_data.get('yield_servings', '1.00')))
        if yield_servings <= Decimal('0.00'):
            raise ValidationError("Yield servings must be greater than zero.")

        recipe = Recipe.objects.create(
            restaurant=restaurant,
            menu_item=menu_item,
            yield_servings=yield_servings,
            instructions=(validated_data.get('instructions') or '').strip(),
            is_active=validated_data.get('is_active', True),
        )

        seen_items = set()
        for item_entry in items_data:
            inv_item = item_entry.get('inventory_item')
            if not inv_item or inv_item.restaurant_id != restaurant.id:
                raise ValidationError("Inventory item does not belong to your restaurant.")

            if inv_item.id in seen_items:
                raise ValidationError(f"Duplicate ingredient '{inv_item.name}' in recipe.")
            seen_items.add(inv_item.id)

            qty = Decimal(str(item_entry.get('quantity_required', '0')))
            if qty <= Decimal('0.0000'):
                raise ValidationError(f"Quantity for '{inv_item.name}' must be greater than zero.")

            line_uom = item_entry.get('uom') or inv_item.uom

            # Verify UOM compatibility immediately
            try:
                UOMConverter.convert(quantity=qty, source_uom=line_uom, target_uom=inv_item.uom)
            except ValidationError as e:
                raise ValidationError(f"Ingredient '{inv_item.name}': {str(e)}")

            RecipeItem.objects.create(
                recipe=recipe,
                inventory_item=inv_item,
                quantity_required=qty,
                uom=line_uom if line_uom != inv_item.uom else None,
            )

        return recipe

    @staticmethod
    @transaction.atomic
    def update_recipe(recipe, user_profile, validated_data, items_data=None):
        """
        Updates an existing Recipe and its line items.
        """
        restaurant = recipe.restaurant

        if 'yield_servings' in validated_data:
            yield_servings = Decimal(str(validated_data['yield_servings']))
            if yield_servings <= Decimal('0.00'):
                raise ValidationError("Yield servings must be greater than zero.")
            recipe.yield_servings = yield_servings

        if 'instructions' in validated_data:
            recipe.instructions = (validated_data['instructions'] or '').strip()

        if 'is_active' in validated_data:
            recipe.is_active = validated_data['is_active']

        if items_data is not None:
            if not items_data:
                raise ValidationError("At least one recipe ingredient is required.")

            recipe.items.all().delete()
            seen_items = set()

            for item_entry in items_data:
                inv_item = item_entry.get('inventory_item')
                if not inv_item or inv_item.restaurant_id != restaurant.id:
                    raise ValidationError("Inventory item does not belong to your restaurant.")

                if inv_item.id in seen_items:
                    raise ValidationError(f"Duplicate ingredient '{inv_item.name}' in recipe.")
                seen_items.add(inv_item.id)

                qty = Decimal(str(item_entry.get('quantity_required', '0')))
                if qty <= Decimal('0.0000'):
                    raise ValidationError(f"Quantity for '{inv_item.name}' must be greater than zero.")

                line_uom = item_entry.get('uom') or inv_item.uom

                # Verify UOM compatibility
                try:
                    UOMConverter.convert(quantity=qty, source_uom=line_uom, target_uom=inv_item.uom)
                except ValidationError as e:
                    raise ValidationError(f"Ingredient '{inv_item.name}': {str(e)}")

                RecipeItem.objects.create(
                    recipe=recipe,
                    inventory_item=inv_item,
                    quantity_required=qty,
                    uom=line_uom if line_uom != inv_item.uom else None,
                )

        recipe.save()
        return recipe

    @staticmethod
    def get_recipe_summary(restaurant):
        """
        Calculates live database metrics for recipes overview.
        """
        if not restaurant:
            return {
                "total_recipes": 0,
                "active_recipes": 0,
                "menu_items_with_recipes_count": 0,
                "menu_items_without_recipes_count": 0,
                "avg_food_cost_percentage": "0.0",
                "low_stock_recipes_count": 0,
            }

        recipes = (
            Recipe.objects
            .filter(restaurant=restaurant)
            .select_related('menu_item')
            .prefetch_related('items__inventory_item')
        )

        total_recipes = recipes.count()
        active_recipes = recipes.filter(is_active=True).count()

        total_menu_items = MenuItem.objects.filter(menu__restaurant=restaurant, is_available=True).count()
        without_recipes = max(0, total_menu_items - total_recipes)

        # Average Food Cost %
        food_cost_percentages = []
        low_stock_count = 0

        for r in recipes:
            fc_pct = r.food_cost_percentage
            if fc_pct is not None:
                food_cost_percentages.append(fc_pct)

            # Check if any ingredient is in low stock
            has_low_stock = any(
                item.inventory_item.is_low_stock or item.inventory_item.is_out_of_stock
                for item in r.items.all()
            )
            if has_low_stock:
                low_stock_count += 1

        avg_fc = (
            sum(food_cost_percentages) / len(food_cost_percentages)
            if food_cost_percentages
            else Decimal('0.0')
        )

        return {
            "total_recipes": total_recipes,
            "active_recipes": active_recipes,
            "menu_items_with_recipes_count": total_recipes,
            "menu_items_without_recipes_count": without_recipes,
            "avg_food_cost_percentage": str(avg_fc.quantize(Decimal('0.1'))),
            "low_stock_recipes_count": low_stock_count,
        }
