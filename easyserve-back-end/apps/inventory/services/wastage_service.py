from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Count, F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.constants import StockMovementType, WastageReason
from apps.inventory.models import InventoryItem, StockMovementLog, StockWastage, UnitOfMeasure
from apps.inventory.services.uom_converter import UOMConverter


class WastageService:
    @staticmethod
    @transaction.atomic
    def record_wastage(
        restaurant,
        inventory_item_id,
        quantity,
        uom_id=None,
        reason=WastageReason.EXPIRED.value,
        notes="",
        user_profile=None,
        wastage_date=None,
    ):
        """
        Atomically records inventory wastage, validates stock sufficiency,
        deducts current stock, creates an immutable StockMovementLog ledger entry,
        and creates a persistent StockWastage record.
        """
        if not restaurant:
            raise ValidationError("Restaurant context is required.")

        # 1. Lock item row to avoid race conditions
        try:
            item = InventoryItem.objects.select_for_update().get(
                id=inventory_item_id,
                restaurant=restaurant
            )
        except InventoryItem.DoesNotExist:
            raise ValidationError("Inventory item not found for this restaurant.")

        # 2. Validate positive quantity
        try:
            qty_decimal = Decimal(str(quantity))
        except (ValueError, TypeError):
            raise ValidationError("A valid numeric quantity is required.")

        if qty_decimal <= Decimal('0.000'):
            raise ValidationError("Wastage quantity must be strictly greater than zero.")

        # 3. Handle UOM conversion if an override unit was submitted
        if uom_id and int(uom_id) != item.uom_id:
            try:
                input_uom = UnitOfMeasure.objects.get(id=uom_id, restaurant=restaurant)
            except UnitOfMeasure.DoesNotExist:
                try:
                    input_uom = UnitOfMeasure.objects.get(id=uom_id)
                except UnitOfMeasure.DoesNotExist:
                    raise ValidationError("Specified Unit of Measure does not exist.")

            converted_qty = UOMConverter.convert(qty_decimal, input_uom, item.uom)
        else:
            converted_qty = qty_decimal

        converted_qty_quantized = converted_qty.quantize(Decimal('0.001'))

        # 4. Validate sufficient stock
        if item.current_stock < converted_qty_quantized:
            unit_code = item.uom.short_code if item.uom else "units"
            raise ValidationError(
                f"Insufficient stock for '{item.name}'. Available: {item.current_stock} {unit_code}, "
                f"Requested wastage: {converted_qty_quantized} {unit_code}."
            )

        # 5. Capture cost basis at recording time (WAC)
        unit_cost = item.cost_per_unit or Decimal('0.00')
        total_loss_value = (converted_qty_quantized * unit_cost).quantize(Decimal('0.01'))

        # 6. Deduct stock atomically
        item.current_stock -= converted_qty_quantized
        item.save(update_fields=['current_stock', 'updated_at'])

        # 7. Create StockWastage audit record
        effective_date = wastage_date or timezone.now().date()
        wastage = StockWastage.objects.create(
            restaurant=restaurant,
            inventory_item=item,
            quantity=converted_qty_quantized,
            uom=item.uom,
            reason=int(reason) if reason else WastageReason.EXPIRED.value,
            notes=notes.strip() if notes else '',
            unit_cost=unit_cost,
            total_cost=total_loss_value,
            wastage_date=effective_date,
            created_by=user_profile
        )

        # 8. Create StockMovementLog ledger entry
        reason_label = wastage.get_reason_display()
        audit_note = f"WASTAGE ({reason_label})"
        if notes and notes.strip():
            audit_note = f"{audit_note}: {notes.strip()}"

        movement = StockMovementLog.objects.create(
            restaurant=restaurant,
            inventory_item=item,
            movement_type=StockMovementType.WASTAGE.value,
            quantity_delta=-converted_qty_quantized,
            balance_after=item.current_stock,
            unit_cost=unit_cost,
            total_value=total_loss_value,
            reference_note=audit_note[:255],
            wastage=wastage,
            logged_by=user_profile
        )

        return wastage, movement, item

    @staticmethod
    def get_wastage_summary(restaurant):
        """
        Calculates live database-backed wastage analytics and KPIs.
        """
        if not restaurant:
            return {
                "today_cost": "0.00",
                "this_week_cost": "0.00",
                "this_month_cost": "0.00",
                "total_records": 0,
                "total_quantity": "0.000",
                "top_wasted_items": [],
                "top_reasons": [],
            }

        today = timezone.now().date()
        start_of_week = today - timedelta(days=today.weekday())
        start_of_month = today.replace(day=1)

        base_qs = StockWastage.objects.filter(restaurant=restaurant)

        # Today's cost
        today_cost = base_qs.filter(wastage_date=today).aggregate(
            val=Sum('total_cost')
        )['val'] or Decimal('0.00')

        # This week's cost
        week_cost = base_qs.filter(wastage_date__gte=start_of_week).aggregate(
            val=Sum('total_cost')
        )['val'] or Decimal('0.00')

        # This month's cost
        month_cost = base_qs.filter(wastage_date__gte=start_of_month).aggregate(
            val=Sum('total_cost')
        )['val'] or Decimal('0.00')

        total_records = base_qs.count()
        total_qty = base_qs.aggregate(val=Sum('quantity'))['val'] or Decimal('0.000')

        # Top wasted items
        top_items_qs = (
            base_qs.values('inventory_item__id', 'inventory_item__name', 'inventory_item__uom__short_code')
            .annotate(
                total_loss=Sum('total_cost'),
                total_qty=Sum('quantity'),
                incidents=Count('id')
            )
            .order_by('-total_loss')[:5]
        )

        top_wasted_items = [
            {
                "item_id": itm['inventory_item__id'],
                "item_name": itm['inventory_item__name'],
                "unit_code": itm['inventory_item__uom__short_code'] or "",
                "total_loss": str(itm['total_loss'].quantize(Decimal('0.01'))),
                "total_qty": str(itm['total_qty'].quantize(Decimal('0.001'))),
                "incidents": itm['incidents'],
            }
            for itm in top_items_qs
        ]

        # Top wastage reasons
        reasons_map = dict(WastageReason.model_choices())
        top_reasons_qs = (
            base_qs.values('reason')
            .annotate(
                total_loss=Sum('total_cost'),
                incidents=Count('id')
            )
            .order_by('-total_loss')
        )

        top_reasons = [
            {
                "reason_code": r['reason'],
                "reason_label": reasons_map.get(r['reason'], "Other"),
                "total_loss": str(r['total_loss'].quantize(Decimal('0.01'))),
                "incidents": r['incidents'],
            }
            for r in top_reasons_qs
        ]

        return {
            "today_cost": str(today_cost.quantize(Decimal('0.01'))),
            "this_week_cost": str(week_cost.quantize(Decimal('0.01'))),
            "this_month_cost": str(month_cost.quantize(Decimal('0.01'))),
            "total_records": total_records,
            "total_quantity": str(total_qty.quantize(Decimal('0.001'))),
            "top_wasted_items": top_wasted_items,
            "top_reasons": top_reasons,
        }
