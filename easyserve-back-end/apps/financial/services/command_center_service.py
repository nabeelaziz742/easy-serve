from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, F, Q
from django.utils import timezone

from apps.restaurants.models import Orders, OrderItem, UserProfile
from apps.restaurants.constants import OrderStatus, PaymentStatus, OrderType, PaymentMethod
from apps.inventory.models import InventoryItem, StockMovementLog, StockWastage
from apps.inventory.constants import StockMovementType, WastageReason
from apps.purchases.models import PurchaseOrder
from apps.purchases.constants import PurchaseStatus
from apps.expenses.models import Expense
from apps.expenses.constants import ExpenseStatus, ExpensePaymentMethod
from apps.financial.constants import FinancialPeriodPreset
from apps.financial.services.financial_service import FinancialReportService

User = get_user_model()



class CommandCenterService:
    """
    Manager Command Center Aggregator.
    Aggregates operational telemetry, financial intelligence, inventory alerts,
    purchase/expense snapshots, and real system activity into an optimized payload.
    """

    @classmethod
    def get_command_center_data(cls, restaurant, preset=None, start_date=None, end_date=None):
        if not restaurant:
            return {}

        # 1. Resolve Period Dates in Restaurant Local Timezone
        start_d, end_d, prev_start, prev_end, preset_name = FinancialReportService.resolve_period_dates(
            preset=preset or FinancialPeriodPreset.TODAY.value,
            start_date=start_date,
            end_date=end_date
        )

        now_local = FinancialReportService.get_local_now()
        today_date = now_local.date()

        # 2. Executive Financial Overview (reuses Phase 6 FinancialReportService)
        financial_overview = FinancialReportService.calculate_overview(
            restaurant=restaurant,
            start_date=start_d,
            end_date=end_d,
            prev_start_date=prev_start,
            prev_end_date=prev_end,
            preset_name=preset_name
        )

        # 3. Live Operational Order Pipeline & Telemetry (Filtered to selected period or today)
        orders_qs = Orders.objects.filter(
            Q(table__restaurant=restaurant)
            | Q(dine_in_session__restaurant=restaurant)
            | Q(items__menu_item__menu__restaurant=restaurant)
        ).distinct()

        period_orders = orders_qs.filter(
            Q(ordered_date__date__gte=start_d, ordered_date__date__lte=end_d) |
            Q(ordered_date__isnull=True, created_at__date__gte=start_d, created_at__date__lte=end_d)
        )

        # Status counts for period
        total_orders_count = period_orders.count()
        pending_count = period_orders.filter(order_status=OrderStatus.TO_PREPARE).count()
        preparing_count = period_orders.filter(order_status=OrderStatus.PREPARING).count()
        prepared_count = period_orders.filter(order_status=OrderStatus.PREPARED).count()
        served_count = period_orders.filter(order_status=OrderStatus.SERVED).count()
        completed_count = period_orders.filter(payment_status=PaymentStatus.CONFIRMED.value).count()
        cancelled_count = period_orders.filter(order_cancelled=True).count()

        # Floor and Kitchen Staff count
        active_waiters_count = User.objects.filter(
            user_type="waiter",
            profile__restaurant=restaurant,
            is_active=True
        ).count()
        active_chefs_count = User.objects.filter(
            user_type="chef",
            profile__restaurant=restaurant,
            is_active=True
        ).count()

        pipeline_data = {
            "total_orders": total_orders_count,
            "pending": pending_count,
            "preparing": preparing_count,
            "prepared": prepared_count,
            "served": served_count,
            "completed": completed_count,
            "cancelled": cancelled_count,
            "orders_in_kitchen": pending_count + preparing_count,
            "orders_ready_to_serve": prepared_count,
            "active_waiters": active_waiters_count,
            "active_chefs": active_chefs_count,
        }

        # 4. Inventory Health & Attention Alerts
        active_items = InventoryItem.objects.filter(
            restaurant=restaurant,
            is_active=True
        ).select_related('uom', 'category')

        out_of_stock_items = active_items.filter(current_stock__lte=0).order_by('name')
        low_stock_items = active_items.filter(
            current_stock__gt=0,
            current_stock__lte=F('min_reorder_level')
        ).order_by('name')

        out_of_stock_count = out_of_stock_items.count()
        low_stock_count = low_stock_items.count()

        draft_pos = PurchaseOrder.objects.filter(
            restaurant=restaurant,
            status=PurchaseStatus.DRAFT.value
        )
        draft_pos_count = draft_pos.count()

        alerts = []
        if out_of_stock_count > 0:
            alerts.append({
                "id": "alert_out_of_stock",
                "severity": "critical",
                "title": f"{out_of_stock_count} Item{'s' if out_of_stock_count > 1 else ''} Out of Stock",
                "description": "Stock exhausted. Menu items requiring these ingredients cannot be prepared.",
                "cta_label": "View Inventory",
                "cta_link": "/manager/inventory",
            })

        if low_stock_count > 0:
            alerts.append({
                "id": "alert_low_stock",
                "severity": "warning",
                "title": f"{low_stock_count} Item{'s' if low_stock_count > 1 else ''} Low in Stock",
                "description": "Stock levels have dropped below minimum reorder thresholds. Reorder recommended.",
                "cta_label": "Order Stock",
                "cta_link": "/manager/purchases",
            })

        if draft_pos_count > 0:
            alerts.append({
                "id": "alert_draft_pos",
                "severity": "info",
                "title": f"{draft_pos_count} Draft Purchase Order{'s' if draft_pos_count > 1 else ''}",
                "description": "Purchase orders awaiting delivery and stock receiving confirmation.",
                "cta_label": "Review Purchases",
                "cta_link": "/manager/purchases",
            })

        inventory_alerts_widget = {
            "out_of_stock_count": out_of_stock_count,
            "low_stock_count": low_stock_count,
            "total_items_count": active_items.count(),
            "critical_items": [
                {
                    "id": item.id,
                    "name": item.name,
                    "sku": item.sku or "",
                    "current_stock": float(item.current_stock),
                    "min_reorder_level": float(item.min_reorder_level),
                    "uom_symbol": item.uom.short_code if item.uom else "",
                    "category_name": item.category.name if item.category else "",
                    "status": "out_of_stock"
                }
                for item in out_of_stock_items[:5]
            ],
            "warning_items": [
                {
                    "id": item.id,
                    "name": item.name,
                    "sku": item.sku or "",
                    "current_stock": float(item.current_stock),
                    "min_reorder_level": float(item.min_reorder_level),
                    "uom_symbol": item.uom.short_code if item.uom else "",
                    "category_name": item.category.name if item.category else "",
                    "status": "low_stock"
                }
                for item in low_stock_items[:5]
            ],
        }

        # 5. Recent Purchases Snapshot (Top 5)
        recent_pos = PurchaseOrder.objects.filter(
            restaurant=restaurant
        ).select_related('supplier').order_by('-purchase_date', '-id')[:5]

        status_labels = {
            PurchaseStatus.DRAFT.value: "Draft",
            PurchaseStatus.RECEIVED.value: "Received",
            PurchaseStatus.CANCELLED.value: "Cancelled",
        }

        recent_purchases_data = [
            {
                "id": po.id,
                "purchase_number": po.purchase_number or f"PO-{po.id:04d}",
                "supplier_name": po.supplier.name if po.supplier else "Unknown Supplier",
                "total_amount": float(po.total_amount),
                "status_value": po.status,
                "status_label": status_labels.get(po.status, "Draft"),
                "purchase_date": po.purchase_date.isoformat(),
            }
            for po in recent_pos
        ]

        # 6. Recent Active Expenses Snapshot (Top 5)
        recent_exp = Expense.objects.filter(
            restaurant=restaurant,
            status=ExpenseStatus.ACTIVE.value
        ).select_related('category').order_by('-expense_date', '-id')[:5]

        payment_method_labels = {
            ExpensePaymentMethod.CASH.value: "Cash",
            ExpensePaymentMethod.CARD.value: "Credit/Debit Card",
            ExpensePaymentMethod.BANK_TRANSFER.value: "Bank Transfer",
            ExpensePaymentMethod.ONLINE.value: "Online",
            ExpensePaymentMethod.OTHER.value: "Other",
        }


        recent_expenses_data = [
            {
                "id": exp.id,
                "expense_number": exp.expense_number or f"EXP-{exp.id:04d}",
                "title": exp.title,
                "category_name": exp.category.name if exp.category else "General",
                "amount": float(exp.amount),
                "payment_method_label": payment_method_labels.get(exp.payment_method, "Cash"),
                "expense_date": exp.expense_date.isoformat(),
            }
            for exp in recent_exp
        ]

        # 7. Top Selling Menu Items (Top 5 for selected period)
        product_performance = FinancialReportService.calculate_product_performance(
            restaurant=restaurant,
            start_date=start_d,
            end_date=end_d,
            sort_by="revenue",
            limit=5
        )

        # 8. Real Recent Activity Feed (Interleaved events from DB)
        activity_feed = []

        # Recent Received Purchases
        for po in PurchaseOrder.objects.filter(
            restaurant=restaurant,
            status=PurchaseStatus.RECEIVED.value
        ).select_related('supplier').order_by('-updated_at')[:3]:
            activity_feed.append({
                "id": f"po_{po.id}",
                "type": "PURCHASE_RECEIVED",
                "title": f"Stock In — {po.purchase_number or f'PO-{po.id:04d}'}",
                "description": f"Received purchase from {po.supplier.name if po.supplier else 'Supplier'}",
                "amount": float(po.total_amount),
                "timestamp": po.updated_at.isoformat(),
                "icon": "PackageCheck",
                "color": "emerald"
            })

        # Recent Recorded Expenses
        for exp in Expense.objects.filter(
            restaurant=restaurant,
            status=ExpenseStatus.ACTIVE.value
        ).select_related('category').order_by('-created_at')[:3]:
            activity_feed.append({
                "id": f"exp_{exp.id}",
                "type": "EXPENSE_RECORDED",
                "title": f"Expense — {exp.title}",
                "description": f"Logged under {exp.category.name if exp.category else 'General'}",
                "amount": float(exp.amount),
                "timestamp": exp.created_at.isoformat(),
                "icon": "Receipt",
                "color": "amber"
            })

        # Recent Stock Adjustments
        for adj in StockMovementLog.objects.filter(
            restaurant=restaurant,
            movement_type=StockMovementType.ADJUSTMENT.value
        ).select_related('inventory_item').order_by('-created_at')[:3]:
            activity_feed.append({
                "id": f"adj_{adj.id}",
                "type": "STOCK_ADJUSTMENT",
                "title": f"Stock Adjusted — {adj.inventory_item.name if adj.inventory_item else 'Item'}",
                "description": adj.reference_note or "Manual inventory level adjustment",
                "amount": float(adj.total_value),
                "timestamp": adj.created_at.isoformat(),
                "icon": "SlidersHorizontal",
                "color": "blue"
            })

        # Recent Wastage
        for wst in StockWastage.objects.filter(
            restaurant=restaurant
        ).select_related('inventory_item', 'uom').order_by('-created_at')[:3]:
            reason_labels = {
                WastageReason.EXPIRED.value: "Expired",
                WastageReason.SPOILED.value: "Spoiled",
                WastageReason.PREPARATION_LOSS.value: "Preparation Loss",
                WastageReason.DAMAGED.value: "Damaged",
                WastageReason.OTHER.value: "Other",
            }
            activity_feed.append({
                "id": f"wst_{wst.id}",
                "type": "WASTAGE_RECORDED",
                "title": f"Wastage — {wst.inventory_item.name if wst.inventory_item else 'Item'}",
                "description": f"Reason: {reason_labels.get(wst.reason, 'Wastage')} ({float(wst.quantity)} {wst.uom.short_code if wst.uom else ''})",
                "amount": float(wst.total_cost),
                "timestamp": wst.created_at.isoformat(),
                "icon": "Trash2",
                "color": "red"
            })

        # Sort combined activity feed chronologically descending
        activity_feed.sort(key=lambda x: x["timestamp"], reverse=True)
        recent_activities = activity_feed[:8]

        # 9. Financial Trends Time-Series for Selected Period
        financial_trends = FinancialReportService.calculate_trends(
            restaurant=restaurant,
            start_date=start_d,
            end_date=end_d
        )

        return {
            "period": {
                "preset": preset_name,
                "start_date": start_d.isoformat(),
                "end_date": end_d.isoformat(),
                "today_date": today_date.isoformat(),
                "is_today": (start_d == today_date and end_d == today_date),
            },
            "financial": financial_overview,
            "pipeline": pipeline_data,
            "attention": {
                "total_alerts": len(alerts),
                "alerts": alerts,
            },
            "inventory_alerts": inventory_alerts_widget,
            "recent_purchases": recent_purchases_data,
            "recent_expenses": recent_expenses_data,
            "top_products": (product_performance if isinstance(product_performance, list) else product_performance.get("products", []))[:5],
            "recent_activities": recent_activities,
            "trends": financial_trends,
        }


