from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.restaurants.constants import OrderStatus
from apps.inventory.constants import StockMovementType
from apps.inventory.models import InventoryItem, StockMovementLog
from apps.recipes.models import Recipe
from apps.recipes.services.uom_converter import UOMConverter


class RecipeConsumptionService:
    """
    Core engine for automatic Bill of Materials (BOM) inventory consumption.
    Deducts structured raw stock when an order is transitioned to PREPARED status.
    Guarantees strict atomicity, row-level locking, and idempotency.
    """

    @classmethod
    @transaction.atomic
    def consume_order_inventory(cls, order, user_profile=None):
        """
        Processes stock deduction for an order upon reaching PREPARED status.
        """
        if not order:
            return None, Decimal('0.00')

        # Re-fetch order with row locking for concurrency safety
        from apps.restaurants.models import Orders
        order = Orders.objects.select_for_update().get(id=order.id)

        # IDEMPOTENCY PROTECTION: Never deduct stock more than once for the same order
        if order.inventory_deducted:
            return order, order.total_cogs or Decimal('0.00')

        # Ensure order is in PREPARED status
        if order.order_status != OrderStatus.PREPARED.value:
            return order, Decimal('0.00')

        # Resolve the owning restaurant
        restaurant = None
        if hasattr(order, 'table') and order.table:
            restaurant = order.table.restaurant
        elif hasattr(order, 'user') and order.user and getattr(order.user, 'restaurant', None):
            restaurant = order.user.restaurant

        order_items = list(order.items.select_related('menu_item', 'menu_item__menu__restaurant').all())
        if not order_items:
            order.inventory_deducted = True
            order.save(update_fields=['inventory_deducted', 'updated_at'])
            return order, Decimal('0.00')

        if not restaurant and order_items:
            restaurant = getattr(order_items[0].menu_item.menu, 'restaurant', None)

        total_order_cogs = Decimal('0.00')

        for order_item in order_items:
            menu_item = order_item.menu_item
            if not menu_item:
                continue

            item_qty = Decimal(str(order_item.quantity or 1))
            order_item_cogs = Decimal('0.00')

            # Look up active recipe
            try:
                recipe = (
                    Recipe.objects
                    .select_related('menu_item')
                    .prefetch_related('items__inventory_item', 'items__inventory_item__uom', 'items__uom')
                    .get(menu_item=menu_item, is_active=True)
                )
            except Recipe.DoesNotExist:
                # Menu items without a configured recipe are skipped without consuming raw stock
                continue

            servings = recipe.yield_servings or Decimal('1.00')
            if servings <= Decimal('0.00'):
                servings = Decimal('1.00')

            multiplier = item_qty / servings

            for recipe_line in recipe.items.all():
                inv_item_id = recipe_line.inventory_item_id

                # Lock the target inventory item
                inv_item = (
                    InventoryItem.objects
                    .select_for_update()
                    .get(id=inv_item_id)
                )

                req_qty = recipe_line.quantity_required * multiplier
                effective_uom = recipe_line.effective_uom

                # Convert to base inventory unit
                converted_qty = UOMConverter.convert(
                    quantity=req_qty,
                    source_uom=effective_uom,
                    target_uom=inv_item.uom
                )

                # INSUFFICIENT STOCK VALIDATION
                if inv_item.current_stock < converted_qty:
                    unit_label = inv_item.uom.short_code if inv_item.uom else "units"
                    raise ValidationError(
                        f"Insufficient stock for '{inv_item.name}'. "
                        f"Required: {converted_qty:.3f} {unit_label}, "
                        f"Available: {inv_item.current_stock:.3f} {unit_label}."
                    )

                unit_cost = inv_item.cost_per_unit or Decimal('0.00')
                line_cogs = (converted_qty * unit_cost).quantize(Decimal('0.01'))

                # Deduct inventory stock
                new_stock = inv_item.current_stock - converted_qty
                inv_item.current_stock = new_stock
                inv_item.save(update_fields=['current_stock', 'updated_at'])

                # Create audit ledger entry
                item_uom_label = inv_item.uom.short_code if inv_item.uom else ""
                ref_text = f"Order #{order.id} - {menu_item.name} x {item_qty}"
                StockMovementLog.objects.create(
                    restaurant=restaurant or inv_item.restaurant,
                    inventory_item=inv_item,
                    movement_type=StockMovementType.ORDER_CONSUMPTION.value,
                    quantity_delta=-converted_qty,
                    balance_after=new_stock,
                    unit_cost=unit_cost,
                    total_value=line_cogs,
                    reference_note=ref_text[:255],
                    logged_by=user_profile,
                )

                order_item_cogs += line_cogs

            # Record COGS per unit at order time
            if item_qty > Decimal('0'):
                order_item.unit_cost_at_order = (order_item_cogs / item_qty).quantize(Decimal('0.01'))
                order_item.save(update_fields=['unit_cost_at_order', 'updated_at'])

            total_order_cogs += order_item_cogs

        # Mark order inventory as deducted and record total COGS
        order.total_cogs = total_order_cogs.quantize(Decimal('0.01'))
        order.inventory_deducted = True
        order.save(update_fields=['total_cogs', 'inventory_deducted', 'updated_at'])

        return order, total_order_cogs
