from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Sum, Count, F, Q, DecimalField, ExpressionWrapper
from django.utils import timezone

from apps.restaurants.models import Orders, OrderItem, MenuItem
from apps.restaurants.constants import OrderStatus, PaymentStatus, OrderType, PaymentMethod
from apps.inventory.models import InventoryItem, StockMovementLog, StockWastage
from apps.inventory.constants import StockMovementType, WastageReason
from apps.purchases.models import PurchaseOrder
from apps.purchases.constants import PurchaseStatus
from apps.expenses.models import Expense
from apps.expenses.constants import ExpenseStatus, ExpensePaymentMethod
from apps.financial.constants import FinancialPeriodPreset
from apps.financial.services.financial_service import FinancialReportService


class ReportsService:
    """
    Central Financial & Operational Reporting Engine.
    Generates structured, database-backed datasets for all 10 manager report types.
    """

    @classmethod
    def get_pnl_report(cls, restaurant, start_date, end_date, preset_name="custom"):
        """
        1. Financial / P&L Report
        """
        # Reuses Phase 6 FinancialReportService
        overview = FinancialReportService.calculate_overview(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date,
            preset_name=preset_name
        )
        rev_breakdown = FinancialReportService.calculate_revenue_breakdown(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date
        )
        exp_breakdown = FinancialReportService.calculate_expense_breakdown(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date
        )
        wst_breakdown = FinancialReportService.calculate_wastage_breakdown(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date
        )

        return {
            "report_type": "pnl",
            "title": "Profit & Loss Financial Statement",
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "preset": preset_name,
            },
            "overview": overview,
            "revenue_breakdown": rev_breakdown,
            "expense_breakdown": exp_breakdown,
            "wastage_breakdown": wst_breakdown,
        }

    @classmethod
    def get_sales_report(cls, restaurant, start_date, end_date):
        """
        2. Sales Report
        Detailed transaction ledger of confirmed, non-cancelled orders.
        """
        orders_qs = Orders.objects.filter(
            Q(table__restaurant=restaurant) | Q(items__menu_item__menu__restaurant=restaurant),
            order_cancelled=False,
            payment_status=PaymentStatus.CONFIRMED.value
        ).distinct()

        period_orders = orders_qs.filter(
            Q(ordered_date__date__gte=start_date, ordered_date__date__lte=end_date) |
            Q(ordered_date__isnull=True, created_at__date__gte=start_date, created_at__date__lte=end_date)
        ).select_related('table', 'waiter').prefetch_related('payment').order_by('-ordered_date', '-id')

        order_rows = []
        total_gross = Decimal("0.00")
        total_cogs = Decimal("0.00")

        order_type_labels = {
            OrderType.DINE_IN.value: "Dine In",
            OrderType.TAKEAWAY.value: "Takeaway",
            OrderType.DELIVERY.value: "Delivery",
        }

        status_labels = {
            OrderStatus.TO_PREPARE.value: "To Prepare",
            OrderStatus.PREPARING.value: "Preparing",
            OrderStatus.PREPARED.value: "Prepared",
            OrderStatus.SERVED.value: "Served",
        }

        for ord_obj in period_orders:
            gross = ord_obj.total_price or Decimal("0.00")
            cogs = ord_obj.total_cogs or Decimal("0.00")
            profit = gross - cogs
            margin = round((profit / gross * 100), 2) if gross > 0 else Decimal("0.00")

            total_gross += gross
            total_cogs += cogs

            ord_dt = ord_obj.ordered_date or ord_obj.created_at
            local_dt = ord_dt.astimezone(FinancialReportService.get_local_now().tzinfo) if ord_dt else None

            # Resolve payment mode from payment relation if available
            pay_mode = "Cash"
            if hasattr(ord_obj, "payment") and ord_obj.payment and ord_obj.payment.method:
                pay_mode = str(ord_obj.payment.method).capitalize()

            order_rows.append({
                "id": ord_obj.id,
                "order_number": f"ORD-{ord_obj.id:05d}",
                "date": local_dt.strftime("%Y-%m-%d") if local_dt else "",
                "time": local_dt.strftime("%H:%M") if local_dt else "",
                "table_number": ord_obj.table.table_number if ord_obj.table else "N/A",
                "order_type": order_type_labels.get(ord_obj.order_type, "Dine In"),
                "status": status_labels.get(ord_obj.order_status, "Confirmed"),
                "payment_mode": pay_mode,
                "gross_amount": float(gross),
                "discount_amount": 0.0,
                "net_amount": float(gross),
                "cogs": float(cogs),
                "gross_profit": float(profit),
                "gross_margin": float(margin),
            })

        total_profit = total_gross - total_cogs
        overall_margin = round((total_profit / total_gross * 100), 2) if total_gross > 0 else Decimal("0.00")

        return {
            "report_type": "sales",
            "title": "Sales Activity Report",
            "period": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "summary": {
                "total_orders": len(order_rows),
                "total_gross_sales": float(total_gross),
                "gross_sales": float(total_gross),
                "total_net_sales": float(total_gross),
                "total_cogs": float(total_cogs),
                "total_gross_profit": float(total_profit),
                "overall_margin": float(overall_margin),
            },
            "orders": order_rows,
        }


    @classmethod
    def get_cogs_report(cls, restaurant, start_date, end_date):
        """
        3. COGS & Food Cost Report
        Item-level consumption and historical cost analysis.
        """
        perf = FinancialReportService.calculate_product_performance(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date,
            sort_by="cogs",
            limit=500
        )
        products = perf if isinstance(perf, list) else perf.get("products", [])

        total_rev = Decimal("0.00")
        total_cogs = Decimal("0.00")

        for p in products:
            total_rev += Decimal(str(p.get("revenue", 0)))
            total_cogs += Decimal(str(p.get("cogs", 0)))

        overall_food_cost_pct = round((total_cogs / total_rev * 100), 2) if total_rev > 0 else Decimal("0.00")

        return {
            "report_type": "cogs",
            "title": "COGS & Food Cost Analysis Report",
            "period": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "summary": {
                "total_menu_items_sold": len(products),
                "total_revenue": float(total_rev),
                "total_cogs": float(total_cogs),
                "overall_food_cost_pct": float(overall_food_cost_pct),
            },
            "items": products,
        }

    @classmethod
    def get_product_performance_report(cls, restaurant, start_date, end_date, sort_by="revenue"):
        """
        4. Menu / Product Performance Report
        """
        perf = FinancialReportService.calculate_product_performance(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
            limit=500
        )
        products = perf if isinstance(perf, list) else perf.get("products", [])

        return {
            "report_type": "products",
            "title": "Menu Product Performance Report",
            "period": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "sort_by": sort_by,
            "total_items": len(products),
            "products": products,
        }

    @classmethod
    def get_expense_report(cls, restaurant, start_date, end_date):
        """
        5. Expense Report
        Active operating expenses breakdown.
        """
        exp_qs = Expense.objects.filter(
            restaurant=restaurant,
            status=ExpenseStatus.ACTIVE.value,
            expense_date__gte=start_date,
            expense_date__lte=end_date
        ).select_related('category').order_by('-expense_date', '-id')

        payment_method_labels = {
            ExpensePaymentMethod.CASH.value: "Cash",
            ExpensePaymentMethod.CARD.value: "Credit/Debit Card",
            ExpensePaymentMethod.BANK_TRANSFER.value: "Bank Transfer",
            ExpensePaymentMethod.ONLINE.value: "Online",
            ExpensePaymentMethod.OTHER.value: "Other",
        }

        expense_rows = []
        total_exp = Decimal("0.00")
        category_totals = {}
        payment_totals = {}

        for e in exp_qs:
            amt = e.amount or Decimal("0.00")
            total_exp += amt
            cat_name = e.category.name if e.category else "General"
            pm_label = payment_method_labels.get(e.payment_method, "Cash")

            category_totals[cat_name] = category_totals.get(cat_name, Decimal("0.00")) + amt
            payment_totals[pm_label] = payment_totals.get(pm_label, Decimal("0.00")) + amt

            expense_rows.append({
                "id": e.id,
                "expense_number": e.expense_number or f"EXP-{e.id:04d}",
                "expense_date": e.expense_date.isoformat(),
                "category_name": cat_name,
                "title": e.title,
                "vendor_payee": e.vendor_payee or "",
                "payment_method": pm_label,
                "reference_number": e.reference_number or "",
                "amount": float(amt),
            })

        category_breakdown = [
            {
                "category": k,
                "amount": float(v),
                "percentage": round(float(v / total_exp * 100), 2) if total_exp > 0 else 0.0
            }
            for k, v in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
        ]

        payment_breakdown = [
            {
                "payment_method": k,
                "amount": float(v),
                "percentage": round(float(v / total_exp * 100), 2) if total_exp > 0 else 0.0
            }
            for k, v in sorted(payment_totals.items(), key=lambda x: x[1], reverse=True)
        ]

        return {
            "report_type": "expenses",
            "title": "Operating Expense Report",
            "period": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "summary": {
                "total_expenses": float(total_exp),
                "expense_count": len(expense_rows),
                "category_breakdown": category_breakdown,
                "payment_breakdown": payment_breakdown,
            },
            "expenses": expense_rows,
        }

    @classmethod
    def get_wastage_report(cls, restaurant, start_date, end_date):
        """
        6. Wastage Report
        Recorded operational spoilage and stock loss.
        """
        wst_qs = StockWastage.objects.filter(
            restaurant=restaurant,
            wastage_date__gte=start_date,
            wastage_date__lte=end_date
        ).select_related('inventory_item', 'uom').order_by('-wastage_date', '-id')

        reason_labels = {
            WastageReason.EXPIRED.value: "Expired",
            WastageReason.SPOILED.value: "Spoiled",
            WastageReason.DAMAGED.value: "Damaged",
            WastageReason.PREPARATION_LOSS.value: "Preparation Loss",
            WastageReason.OVERPRODUCTION.value: "Overproduction",
            WastageReason.SPILLAGE.value: "Spillage",
            WastageReason.THEFT_LOSS.value: "Theft / Loss",
            WastageReason.QUALITY_ISSUE.value: "Quality Issue",
            WastageReason.OTHER.value: "Other",
        }


        wastage_rows = []
        total_loss = Decimal("0.00")
        reason_totals = {}
        item_totals = {}

        for w in wst_qs:
            cost = w.total_cost or Decimal("0.00")
            total_loss += cost
            r_name = reason_labels.get(w.reason, "Other")
            item_name = w.inventory_item.name if w.inventory_item else "Unknown Item"

            reason_totals[r_name] = reason_totals.get(r_name, Decimal("0.00")) + cost
            item_totals[item_name] = item_totals.get(item_name, Decimal("0.00")) + cost

            wastage_rows.append({
                "id": w.id,
                "date": w.wastage_date.isoformat(),
                "item_name": item_name,
                "quantity": float(w.quantity),
                "uom": w.uom.short_code if w.uom else "",
                "reason": r_name,
                "unit_cost": float(w.unit_cost or 0),
                "total_cost": float(cost),
                "notes": w.notes or "",
            })

        by_reason = [
            {"reason": k, "cost": float(v), "percentage": round(float(v / total_loss * 100), 2) if total_loss > 0 else 0.0}
            for k, v in sorted(reason_totals.items(), key=lambda x: x[1], reverse=True)
        ]

        by_item = [
            {"item_name": k, "cost": float(v), "percentage": round(float(v / total_loss * 100), 2) if total_loss > 0 else 0.0}
            for k, v in sorted(item_totals.items(), key=lambda x: x[1], reverse=True)
        ]

        return {
            "report_type": "wastage",
            "title": "Stock Wastage & Spoilage Report",
            "period": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "summary": {
                "total_loss": float(total_loss),
                "incident_count": len(wastage_rows),
                "by_reason": by_reason,
                "by_item": by_item,
            },
            "wastage_logs": wastage_rows,
        }

    @classmethod
    def get_inventory_report(cls, restaurant):
        """
        7. Inventory Valuation & Stock Status Report
        """
        items_qs = InventoryItem.objects.filter(
            restaurant=restaurant,
            is_active=True
        ).select_related('uom', 'category').order_by('category__name', 'name')

        item_rows = []
        total_valuation = Decimal("0.00")
        low_count = 0
        out_count = 0

        for item in items_qs:
            stock = item.current_stock or Decimal("0.00")
            cpu = item.cost_per_unit or Decimal("0.00")
            val = stock * cpu
            total_valuation += val

            min_reorder = item.min_reorder_level or Decimal("0.00")

            if stock <= Decimal("0.000"):
                status_code = "OUT_OF_STOCK"
                out_count += 1
            elif stock <= min_reorder:
                status_code = "LOW_STOCK"
                low_count += 1
            else:
                status_code = "IN_STOCK"

            item_rows.append({
                "id": item.id,
                "name": item.name,
                "sku": item.sku or "",
                "category_name": item.category.name if item.category else "Uncategorized",
                "current_stock": float(stock),
                "uom": item.uom.short_code if item.uom else "",
                "cost_per_unit": float(cpu),
                "stock_value": float(val),
                "min_reorder_level": float(min_reorder),
                "status": status_code,
            })

        return {
            "report_type": "inventory",
            "title": "Inventory Stock Valuation Report",
            "generated_date": date.today().isoformat(),
            "summary": {
                "total_items": len(item_rows),
                "total_stock_value": float(total_valuation),
                "out_of_stock_count": out_count,
                "low_stock_count": low_count,
                "healthy_count": len(item_rows) - out_count - low_count,
            },
            "items": item_rows,
        }

    @classmethod
    def get_stock_movement_report(cls, restaurant, start_date, end_date):
        """
        8. Stock Movement Audit Ledger
        """
        mov_qs = StockMovementLog.objects.filter(
            restaurant=restaurant,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).select_related('inventory_item', 'inventory_item__uom').order_by('-created_at', '-id')

        movement_labels = {
            StockMovementType.ADJUSTMENT.value: "Adjustment",
            StockMovementType.PURCHASE_IN.value: "Purchase In",
            StockMovementType.ORDER_CONSUMPTION.value: "Order Consumption",
            StockMovementType.WASTAGE.value: "Wastage",
            StockMovementType.PURCHASE_RETURN.value: "Purchase Return",
            1: "Adjustment",
            2: "Purchase In",
            3: "Order Consumption",
            4: "Wastage",
            5: "Purchase Return",
        }


        movement_rows = []
        for m in mov_qs:
            item_name = m.inventory_item.name if m.inventory_item else "Unknown Item"
            uom_str = m.inventory_item.uom.short_code if m.inventory_item and m.inventory_item.uom else ""

            local_dt = m.created_at.astimezone(FinancialReportService.get_local_now().tzinfo)

            movement_rows.append({
                "id": m.id,
                "date": local_dt.strftime("%Y-%m-%d"),
                "time": local_dt.strftime("%H:%M"),
                "item_name": item_name,
                "movement_type": movement_labels.get(m.movement_type, "Adjustment"),
                "quantity_delta": float(m.quantity_delta),
                "balance_after": float(m.balance_after),
                "uom": uom_str,
                "unit_cost": float(m.unit_cost or 0),
                "total_value": float(m.total_value or 0),
                "reference_note": m.reference_note or "",
            })

        return {
            "report_type": "movements",
            "title": "Stock Movement Ledger Report",
            "period": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "summary": {"total_movements": len(movement_rows)},
            "movements": movement_rows,
        }

    @classmethod
    def get_purchase_report(cls, restaurant, start_date, end_date):
        """
        9. Purchase / Supplier Report
        """
        po_qs = PurchaseOrder.objects.filter(
            restaurant=restaurant,
            purchase_date__gte=start_date,
            purchase_date__lte=end_date
        ).select_related('supplier').order_by('-purchase_date', '-id')

        status_labels = {
            PurchaseStatus.DRAFT.value: "Draft",
            PurchaseStatus.RECEIVED.value: "Received",
            PurchaseStatus.CANCELLED.value: "Cancelled",
        }

        po_rows = []
        total_purchases = Decimal("0.00")
        supplier_totals = {}

        for po in po_qs:
            tot = po.total_amount or Decimal("0.00")
            total_purchases += tot
            sup_name = po.supplier.name if po.supplier else "Unknown Supplier"
            supplier_totals[sup_name] = supplier_totals.get(sup_name, Decimal("0.00")) + tot

            po_rows.append({
                "id": po.id,
                "purchase_number": po.purchase_number or f"PO-{po.id:04d}",
                "invoice_number": po.invoice_number or "",
                "supplier_name": sup_name,
                "purchase_date": po.purchase_date.isoformat(),
                "status": status_labels.get(po.status, "Draft"),
                "subtotal": float(po.subtotal or 0),
                "tax_amount": float(po.tax_amount or 0),
                "total_amount": float(tot),
            })

        supplier_breakdown = [
            {"supplier": k, "total_spend": float(v), "percentage": round(float(v / total_purchases * 100), 2) if total_purchases > 0 else 0.0}
            for k, v in sorted(supplier_totals.items(), key=lambda x: x[1], reverse=True)
        ]

        return {
            "report_type": "purchases",
            "title": "Purchase & Supplier Spend Report",
            "period": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "summary": {
                "total_purchase_count": len(po_rows),
                "total_spend": float(total_purchases),
                "supplier_breakdown": supplier_breakdown,
            },
            "purchases": po_rows,
        }

    @classmethod
    def get_reconciliation_report(cls, restaurant, start_date, end_date):
        """
        10. Cash & Payment Reconciliation Report
        """
        rec = FinancialReportService.calculate_reconciliation(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date
        )

        return {
            "report_type": "reconciliation",
            "title": "Cash & Audit Reconciliation Report",
            "period": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "reconciliation": rec,
        }
