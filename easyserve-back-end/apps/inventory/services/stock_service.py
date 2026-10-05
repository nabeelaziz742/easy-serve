from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, F, Q, Count
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.constants import StockMovementType, StockAdjustmentReason
from apps.inventory.models import InventoryItem, StockMovementLog, InventoryCategory, StockWastage


class StockService:
    @staticmethod
    def resolve_user_restaurant(user, explicit_restaurant_id=None):
        """
        Resolves the target restaurant for the current user with strict tenancy validation.
        """
        if not user or not user.is_authenticated:
            return None

        profile = getattr(user, 'profile', None)
        if not profile:
            return None

        user_type = getattr(user, 'user_type', None)

        if user_type == 'super_admin':
            from apps.restaurants.models import Restaurant
            if explicit_restaurant_id:
                return Restaurant.objects.filter(id=explicit_restaurant_id).first()
            return Restaurant.objects.filter(is_active=True).first()

        if user_type == 'restaurant_owner':
            owned = profile.owned_restaurants.all()
            if explicit_restaurant_id:
                return owned.filter(id=explicit_restaurant_id).first()
            if profile.selected_restaurant:
                sel = owned.filter(id=profile.selected_restaurant).first()
                if sel:
                    return sel
            return owned.first()

        # Manager / Chef
        if explicit_restaurant_id:
            from apps.restaurants.models import Restaurant
            try:
                exp_id = int(explicit_restaurant_id)
            except (ValueError, TypeError):
                exp_id = None

            if exp_id:
                if profile.restaurant_id == exp_id:
                    return profile.restaurant
                if profile.selected_restaurant == exp_id:
                    return Restaurant.objects.filter(id=exp_id).first()
                if profile.owned_restaurants.filter(id=exp_id).exists():
                    return profile.owned_restaurants.filter(id=exp_id).first()

        if profile.restaurant:
            return profile.restaurant
        if profile.selected_restaurant:
            from apps.restaurants.models import Restaurant
            sel = Restaurant.objects.filter(id=profile.selected_restaurant).first()
            if sel:
                return sel
        return profile.owned_restaurants.first()

    @staticmethod
    @transaction.atomic
    def create_item_with_opening_stock(validated_data, user_profile):
        """
        Creates an InventoryItem and automatically logs the opening stock transaction if current_stock > 0.
        """
        initial_stock = validated_data.get('current_stock', Decimal('0.000'))
        if initial_stock is None:
            initial_stock = Decimal('0.000')

        item = InventoryItem.objects.create(**validated_data)

        if initial_stock > Decimal('0.000'):
            StockMovementLog.objects.create(
                restaurant=item.restaurant,
                inventory_item=item,
                movement_type=StockMovementType.ADJUSTMENT.value,
                quantity_delta=initial_stock,
                balance_after=initial_stock,
                unit_cost=item.cost_per_unit,
                total_value=(initial_stock * item.cost_per_unit).quantize(Decimal('0.01')),
                reference_note="Opening Stock Initial Count",
                logged_by=user_profile
            )

        return item

    @staticmethod
    @transaction.atomic
    def adjust_stock(item_id, restaurant, new_quantity=None, quantity_delta=None, reason_text=None, user_profile=None, notes=None):
        """
        Atomically adjusts inventory level and appends an immutable StockMovementLog audit record.
        Supports setting either explicit new_quantity or relative quantity_delta.
        """
        try:
            item = InventoryItem.objects.select_for_update().get(id=item_id, restaurant=restaurant)
        except InventoryItem.DoesNotExist:
            raise ValidationError("Inventory item not found for this restaurant.")

        old_stock = item.current_stock

        if new_quantity is not None:
            target_stock = Decimal(str(new_quantity)).quantize(Decimal('0.001'))
            delta = target_stock - old_stock
        elif quantity_delta is not None:
            delta = Decimal(str(quantity_delta)).quantize(Decimal('0.001'))
            target_stock = old_stock + delta
        else:
            raise ValidationError("Either new_quantity or quantity_delta must be provided.")

        if target_stock < Decimal('0.000'):
            unit_code = item.uom.short_code if item.uom else "units"
            raise ValidationError(
                f"Adjustment would result in negative stock ({target_stock} {unit_code}). "
                f"Current stock is {old_stock} {unit_code}."
            )

        if delta == Decimal('0.000'):
            raise ValidationError("New stock count is identical to existing system stock. No adjustment needed.")

        # Update stock
        item.current_stock = target_stock
        item.save(update_fields=['current_stock', 'updated_at'])

        # Build reference note
        full_reason = (reason_text or "Manual Stock Adjustment").strip()
        if notes and notes.strip():
            full_reason = f"{full_reason}: {notes.strip()}"

        total_affected_val = (abs(delta) * item.cost_per_unit).quantize(Decimal('0.01'))

        # Create audit entry
        movement = StockMovementLog.objects.create(
            restaurant=restaurant,
            inventory_item=item,
            movement_type=StockMovementType.ADJUSTMENT.value,
            quantity_delta=delta,
            balance_after=target_stock,
            unit_cost=item.cost_per_unit,
            total_value=total_affected_val,
            reference_note=full_reason[:255],
            logged_by=user_profile
        )

        return item, movement

    @staticmethod
    @transaction.atomic
    def perform_physical_stock_count(restaurant, items_counts, user_profile, audit_notes=""):
        """
        Processes a multi-item physical stock count reconciliation atomically.
        Calculates variances, updates stock levels, and writes detailed audit movements.
        """
        if not restaurant:
            raise ValidationError("Restaurant context is required.")

        if not items_counts or not isinstance(items_counts, list):
            raise ValidationError("A non-empty list of item stock counts is required.")

        item_ids = [entry.get('inventory_item_id') or entry.get('item_id') for entry in items_counts if entry.get('inventory_item_id') or entry.get('item_id')]
        if not item_ids:
            raise ValidationError("No valid inventory item IDs provided in stock count.")

        # Row-level lock all affected inventory items
        locked_items = {
            item.id: item
            for item in InventoryItem.objects.select_for_update().filter(id__in=item_ids, restaurant=restaurant)
        }

        reconciled_results = []
        total_variance_value = Decimal('0.00')

        for entry in items_counts:
            item_id = entry.get('inventory_item_id') or entry.get('item_id')
            item = locked_items.get(int(item_id) if item_id else None)
            if not item:
                continue

            raw_physical = entry.get('physical_count')
            if raw_physical is None:
                continue

            try:
                physical_count = Decimal(str(raw_physical)).quantize(Decimal('0.001'))
            except (ValueError, TypeError):
                raise ValidationError(f"Invalid physical count for item '{item.name}'.")

            if physical_count < Decimal('0.000'):
                raise ValidationError(f"Physical count for '{item.name}' cannot be negative.")

            system_stock = item.current_stock
            variance = physical_count - system_stock
            item_note = (entry.get('notes') or '').strip()

            if variance != Decimal('0.000'):
                # Apply adjustment
                item.current_stock = physical_count
                item.save(update_fields=['current_stock', 'updated_at'])

                variance_val = (abs(variance) * item.cost_per_unit).quantize(Decimal('0.01'))
                total_variance_value += variance_val

                sign = "+" if variance > 0 else ""
                unit_code = item.uom.short_code if item.uom else ""
                note_str = f"Physical Stock Count: System {system_stock} → Physical {physical_count} ({sign}{variance} {unit_code})"
                if item_note:
                    note_str = f"{note_str} - {item_note}"
                elif audit_notes:
                    note_str = f"{note_str} - {audit_notes.strip()}"

                movement = StockMovementLog.objects.create(
                    restaurant=restaurant,
                    inventory_item=item,
                    movement_type=StockMovementType.ADJUSTMENT.value,
                    quantity_delta=variance,
                    balance_after=physical_count,
                    unit_cost=item.cost_per_unit,
                    total_value=variance_val,
                    reference_note=note_str[:255],
                    logged_by=user_profile
                )
                reconciled_results.append({
                    "item_id": item.id,
                    "item_name": item.name,
                    "unit_code": unit_code,
                    "system_stock": str(system_stock),
                    "physical_count": str(physical_count),
                    "variance": str(variance),
                    "unit_cost": str(item.cost_per_unit),
                    "variance_value": str(variance_val),
                    "movement_id": movement.id
                })
            else:
                reconciled_results.append({
                    "item_id": item.id,
                    "item_name": item.name,
                    "unit_code": item.uom.short_code if item.uom else "",
                    "system_stock": str(system_stock),
                    "physical_count": str(physical_count),
                    "variance": "0.000",
                    "unit_cost": str(item.cost_per_unit),
                    "variance_value": "0.00",
                    "movement_id": None
                })

        return {
            "total_items_audited": len(reconciled_results),
            "adjusted_items_count": len([r for r in reconciled_results if r['movement_id'] is not None]),
            "total_variance_value": str(total_variance_value.quantize(Decimal('0.01'))),
            "items": reconciled_results
        }

    @staticmethod
    def get_inventory_summary(restaurant):
        """
        Generates live database-backed metrics for the inventory overview.
        """
        if not restaurant:
            return {
                "total_items": 0,
                "total_stock_value": "0.00",
                "low_stock_count": 0,
                "out_of_stock_count": 0,
                "categories_count": 0,
                "this_month_wastage_cost": "0.00",
                "recent_movements": []
            }

        items_qs = InventoryItem.objects.filter(restaurant=restaurant, is_active=True)
        total_items = items_qs.count()

        total_stock_value = Decimal('0.00')
        for itm in items_qs.only('current_stock', 'cost_per_unit'):
            total_stock_value += (itm.current_stock * itm.cost_per_unit)
        total_stock_value = total_stock_value.quantize(Decimal('0.01'))

        low_stock_count = items_qs.filter(
            current_stock__gt=Decimal('0'),
            current_stock__lte=F('min_reorder_level')
        ).count()

        out_of_stock_count = items_qs.filter(current_stock__lte=Decimal('0')).count()

        categories_count = InventoryCategory.objects.filter(restaurant=restaurant, is_active=True).count()

        # Month wastage cost
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        this_month_wastage_cost = StockWastage.objects.filter(
            restaurant=restaurant,
            wastage_date__gte=start_of_month
        ).aggregate(val=Sum('total_cost'))['val'] or Decimal('0.00')

        recent_movements_qs = (
            StockMovementLog.objects
            .filter(restaurant=restaurant)
            .select_related('inventory_item', 'inventory_item__uom', 'logged_by__user')
            .order_by('-created_at')[:8]
        )

        recent_movements_data = []
        for m in recent_movements_qs:
            user_display = "System"
            if m.logged_by:
                prof = m.logged_by
                full = f"{getattr(prof, 'first_name', '') or ''} {getattr(prof, 'last_name', '') or ''}".strip()
                if full:
                    user_display = full
                elif getattr(prof, 'user', None):
                    user_display = getattr(prof.user, 'username', None) or getattr(prof.user, 'email', None) or "User"

            recent_movements_data.append({
                "id": m.id,
                "item_name": m.inventory_item.name,
                "item_sku": m.inventory_item.sku,
                "unit_code": m.inventory_item.uom.short_code if m.inventory_item.uom else "",
                "movement_type": m.get_movement_type_display(),
                "quantity_delta": float(m.quantity_delta),
                "balance_after": float(m.balance_after),
                "unit_cost": float(m.unit_cost),
                "total_value": float(m.total_value),
                "reference_note": m.reference_note or "",
                "logged_by_name": user_display,
                "created_at": m.created_at.isoformat(),
            })

        return {
            "total_items": total_items,
            "total_stock_value": str(total_stock_value),
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "categories_count": categories_count,
            "this_month_wastage_cost": str(this_month_wastage_cost.quantize(Decimal('0.01'))),
            "recent_movements": recent_movements_data
        }
