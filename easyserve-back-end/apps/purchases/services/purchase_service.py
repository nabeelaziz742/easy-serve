from decimal import Decimal
from datetime import date, timedelta
from django.db import transaction
from django.db.models import Sum, Q, Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.constants import StockMovementType
from apps.inventory.models import InventoryItem, StockMovementLog
from apps.inventory.services import StockService
from apps.purchases.constants import PurchaseStatus
from apps.purchases.models import Supplier, PurchaseOrder, PurchaseOrderItem


class PurchaseService:
    @staticmethod
    def resolve_user_restaurant(user, explicit_restaurant_id=None):
        """
        Resolves the user's active restaurant tenant.
        """
        return StockService.resolve_user_restaurant(user, explicit_restaurant_id)

    @staticmethod
    def generate_purchase_number(restaurant):
        """
        Generates the next sequential purchase reference for this restaurant.
        Example: PO-000001, PO-000002
        """
        last_po = (
            PurchaseOrder.objects
            .filter(restaurant=restaurant)
            .order_by('-id')
            .first()
        )
        if not last_po:
            return "PO-000001"

        # Try to extract the highest numeric suffix
        highest_num = 0
        all_numbers = PurchaseOrder.objects.filter(restaurant=restaurant).values_list('purchase_number', flat=True)
        for p_num in all_numbers:
            if p_num and p_num.startswith("PO-"):
                try:
                    num_part = int(p_num.replace("PO-", "").strip())
                    if num_part > highest_num:
                        highest_num = num_part
                except (ValueError, TypeError):
                    pass

        next_val = highest_num + 1
        candidate = f"PO-{next_val:06d}"

        # Ensure no collision in case of manual overrides
        while PurchaseOrder.objects.filter(restaurant=restaurant, purchase_number=candidate).exists():
            next_val += 1
            candidate = f"PO-{next_val:06d}"

        return candidate

    @staticmethod
    @transaction.atomic
    def create_purchase_order(restaurant, user_profile, validated_data, items_data):
        """
        Creates a DRAFT PurchaseOrder along with its line items.
        Recalculates line item totals, subtotal, and grand total in Decimal.
        """
        if not items_data:
            raise ValidationError("At least one purchase item is required.")

        supplier = validated_data.get('supplier')
        if not supplier or supplier.restaurant_id != restaurant.id:
            raise ValidationError("Invalid supplier for this restaurant.")

        purchase_number = validated_data.get('purchase_number')
        if not purchase_number or not purchase_number.strip():
            purchase_number = PurchaseService.generate_purchase_number(restaurant)

        tax_amount = validated_data.get('tax_amount', Decimal('0.00')) or Decimal('0.00')
        tax_amount = Decimal(str(tax_amount)).quantize(Decimal('0.01'))

        # Prepare purchase order
        po = PurchaseOrder.objects.create(
            restaurant=restaurant,
            supplier=supplier,
            purchase_number=purchase_number,
            invoice_number=(validated_data.get('invoice_number') or '').strip(),
            purchase_date=validated_data.get('purchase_date', date.today()),
            status=PurchaseStatus.DRAFT.value,
            subtotal=Decimal('0.00'),
            tax_amount=tax_amount,
            total_amount=Decimal('0.00'),
            notes=(validated_data.get('notes') or '').strip(),
            created_by=user_profile,
        )

        subtotal = Decimal('0.00')
        seen_items = set()

        for item_entry in items_data:
            inventory_item = item_entry.get('inventory_item')
            if not inventory_item or inventory_item.restaurant_id != restaurant.id:
                raise ValidationError(f"Inventory item does not belong to this restaurant.")

            if inventory_item.id in seen_items:
                raise ValidationError(f"Duplicate inventory item '{inventory_item.name}' in purchase order.")
            seen_items.add(inventory_item.id)

            qty = Decimal(str(item_entry.get('quantity', '0')))
            unit_cost = Decimal(str(item_entry.get('unit_cost', '0'))).quantize(Decimal('0.01'))

            if qty <= Decimal('0'):
                raise ValidationError(f"Quantity for item '{inventory_item.name}' must be greater than zero.")
            if unit_cost < Decimal('0'):
                raise ValidationError(f"Unit cost for item '{inventory_item.name}' cannot be negative.")

            line_total = (qty * unit_cost).quantize(Decimal('0.01'))
            subtotal += line_total

            PurchaseOrderItem.objects.create(
                purchase_order=po,
                inventory_item=inventory_item,
                quantity=qty,
                unit_cost=unit_cost,
                total_cost=line_total,
            )

        po.subtotal = subtotal.quantize(Decimal('0.01'))
        po.total_amount = (subtotal + tax_amount).quantize(Decimal('0.01'))
        po.save(update_fields=['subtotal', 'total_amount', 'updated_at'])

        return po

    @staticmethod
    @transaction.atomic
    def update_purchase_order(purchase_order, user_profile, validated_data, items_data=None):
        """
        Updates a DRAFT PurchaseOrder. Modifying received or cancelled purchases is strictly rejected.
        """
        po = PurchaseOrder.objects.select_for_update().get(id=purchase_order.id)

        if po.status != PurchaseStatus.DRAFT.value:
            raise ValidationError("Only DRAFT purchase orders can be modified.")

        restaurant = po.restaurant

        if 'supplier' in validated_data:
            supplier = validated_data['supplier']
            if supplier.restaurant_id != restaurant.id:
                raise ValidationError("Invalid supplier for this restaurant.")
            po.supplier = supplier

        if 'invoice_number' in validated_data:
            po.invoice_number = (validated_data['invoice_number'] or '').strip()

        if 'purchase_date' in validated_data:
            po.purchase_date = validated_data['purchase_date']

        if 'notes' in validated_data:
            po.notes = (validated_data['notes'] or '').strip()

        if 'tax_amount' in validated_data:
            tax_amount = Decimal(str(validated_data['tax_amount'] or '0.00')).quantize(Decimal('0.01'))
            po.tax_amount = tax_amount

        if items_data is not None:
            if not items_data:
                raise ValidationError("At least one purchase item is required.")

            po.items.all().delete()
            subtotal = Decimal('0.00')
            seen_items = set()

            for item_entry in items_data:
                inventory_item = item_entry.get('inventory_item')
                if not inventory_item or inventory_item.restaurant_id != restaurant.id:
                    raise ValidationError("Inventory item does not belong to this restaurant.")

                if inventory_item.id in seen_items:
                    raise ValidationError(f"Duplicate inventory item '{inventory_item.name}' in purchase order.")
                seen_items.add(inventory_item.id)

                qty = Decimal(str(item_entry.get('quantity', '0')))
                unit_cost = Decimal(str(item_entry.get('unit_cost', '0'))).quantize(Decimal('0.01'))

                if qty <= Decimal('0'):
                    raise ValidationError(f"Quantity for item '{inventory_item.name}' must be greater than zero.")
                if unit_cost < Decimal('0'):
                    raise ValidationError(f"Unit cost for item '{inventory_item.name}' cannot be negative.")

                line_total = (qty * unit_cost).quantize(Decimal('0.01'))
                subtotal += line_total

                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    inventory_item=inventory_item,
                    quantity=qty,
                    unit_cost=unit_cost,
                    total_cost=line_total,
                )

            po.subtotal = subtotal.quantize(Decimal('0.01'))

        po.total_amount = (po.subtotal + po.tax_amount).quantize(Decimal('0.01'))
        po.save()

        return po

    @staticmethod
    @transaction.atomic
    def receive_purchase_order(purchase_order_id, restaurant, user_profile):
        """
        Receives a DRAFT PurchaseOrder atomically:
        1. Validates status == DRAFT (Double-receive protection).
        2. Locks all affected InventoryItem records.
        3. Updates stock quantity: current_stock += purchased_qty.
        4. Calculates and updates Weighted Average Cost (WAC).
        5. Logs an immutable PURCHASE_IN StockMovementLog record.
        6. Updates PurchaseOrder to RECEIVED with received_by and timestamp.
        """
        try:
            po = (
                PurchaseOrder.objects
                .select_for_update()
                .select_related('supplier')
                .get(id=purchase_order_id, restaurant=restaurant)
            )
        except PurchaseOrder.DoesNotExist:
            raise ValidationError("Purchase order not found for this restaurant.")

        # DOUBLE RECEIVING PROTECTION
        if po.status == PurchaseStatus.RECEIVED.value:
            raise ValidationError("This purchase order has already been received and cannot be received again.")

        if po.status == PurchaseStatus.CANCELLED.value:
            raise ValidationError("Cancelled purchase orders cannot be received.")

        if po.status != PurchaseStatus.DRAFT.value:
            raise ValidationError("Only DRAFT purchase orders can be received.")

        po_items = list(po.items.select_related('inventory_item').all())
        if not po_items:
            raise ValidationError("Cannot receive a purchase order with zero line items.")

        reference_label = f"PO #{po.purchase_number} - {po.supplier.name}"
        if po.invoice_number:
            reference_label += f" (Inv: {po.invoice_number})"

        for line_item in po_items:
            # Lock the target inventory item
            inv_item = (
                InventoryItem.objects
                .select_for_update()
                .get(id=line_item.inventory_item_id, restaurant=restaurant)
            )

            current_stock = inv_item.current_stock or Decimal('0.000')
            current_cost = inv_item.cost_per_unit or Decimal('0.00')

            purchased_qty = line_item.quantity
            purchased_unit_cost = line_item.unit_cost

            if purchased_qty <= Decimal('0'):
                raise ValidationError(f"Quantity for '{inv_item.name}' must be greater than zero.")

            new_stock = current_stock + purchased_qty

            # Calculate Weighted Average Cost (WAC)
            if current_stock > Decimal('0.000'):
                total_current_val = current_stock * current_cost
                total_purchased_val = purchased_qty * purchased_unit_cost
                new_wac = (total_current_val + total_purchased_val) / new_stock
            else:
                new_wac = purchased_unit_cost

            new_wac = new_wac.quantize(Decimal('0.01'))

            # Update item
            inv_item.current_stock = new_stock
            inv_item.cost_per_unit = new_wac
            inv_item.save(update_fields=['current_stock', 'cost_per_unit', 'updated_at'])

            # Log stock movement
            line_total_val = (purchased_qty * purchased_unit_cost).quantize(Decimal('0.01'))
            StockMovementLog.objects.create(
                restaurant=restaurant,
                inventory_item=inv_item,
                movement_type=StockMovementType.PURCHASE_IN.value,
                quantity_delta=purchased_qty,
                balance_after=new_stock,
                unit_cost=purchased_unit_cost,
                total_value=line_total_val,
                reference_note=reference_label[:255],
                logged_by=user_profile,
            )

        # Mark purchase order as RECEIVED
        po.status = PurchaseStatus.RECEIVED.value
        po.received_by = user_profile
        po.received_at = timezone.now()
        po.save(update_fields=['status', 'received_by', 'received_at', 'updated_at'])

        return po

    @staticmethod
    @transaction.atomic
    def cancel_purchase_order(purchase_order_id, restaurant, user_profile):
        """
        Cancels a DRAFT PurchaseOrder.
        """
        try:
            po = (
                PurchaseOrder.objects
                .select_for_update()
                .get(id=purchase_order_id, restaurant=restaurant)
            )
        except PurchaseOrder.DoesNotExist:
            raise ValidationError("Purchase order not found for this restaurant.")

        if po.status != PurchaseStatus.DRAFT.value:
            raise ValidationError("Only DRAFT purchase orders can be cancelled.")

        po.status = PurchaseStatus.CANCELLED.value
        po.save(update_fields=['status', 'updated_at'])

        return po

    @staticmethod
    def get_purchases_summary(restaurant):
        """
        Aggregates real-time database metrics for purchases overview.
        """
        if not restaurant:
            return {
                "total_purchase_value": "0.00",
                "this_month_value": "0.00",
                "this_week_value": "0.00",
                "draft_count": 0,
                "received_count": 0,
                "suppliers_count": 0,
                "recent_purchases": []
            }

        received_qs = PurchaseOrder.objects.filter(
            restaurant=restaurant,
            status=PurchaseStatus.RECEIVED.value
        )

        total_purchase_value = received_qs.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0.00')

        today = date.today()
        start_of_month = date(today.year, today.month, 1)
        start_of_week = today - timedelta(days=today.weekday())

        this_month_value = received_qs.filter(
            purchase_date__gte=start_of_month
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

        this_week_value = received_qs.filter(
            purchase_date__gte=start_of_week
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

        draft_count = PurchaseOrder.objects.filter(
            restaurant=restaurant,
            status=PurchaseStatus.DRAFT.value
        ).count()

        received_count = received_qs.count()

        suppliers_count = Supplier.objects.filter(
            restaurant=restaurant,
            is_active=True
        ).count()

        recent_qs = (
            PurchaseOrder.objects
            .filter(restaurant=restaurant)
            .select_related('supplier', 'created_by__user')
            .order_by('-created_at')[:8]
        )

        recent_data = []
        for po in recent_qs:
            recent_data.append({
                "id": po.id,
                "purchase_number": po.purchase_number,
                "supplier_name": po.supplier.name if po.supplier else "Unknown",
                "invoice_number": po.invoice_number,
                "purchase_date": po.purchase_date.isoformat() if po.purchase_date else "",
                "status": po.status,
                "status_display": po.get_status_display(),
                "total_amount": str(po.total_amount),
                "created_at": po.created_at.isoformat(),
            })

        return {
            "total_purchase_value": str(total_purchase_value.quantize(Decimal('0.01'))),
            "this_month_value": str(this_month_value.quantize(Decimal('0.01'))),
            "this_week_value": str(this_week_value.quantize(Decimal('0.01'))),
            "draft_count": draft_count,
            "received_count": received_count,
            "suppliers_count": suppliers_count,
            "recent_purchases": recent_data
        }
