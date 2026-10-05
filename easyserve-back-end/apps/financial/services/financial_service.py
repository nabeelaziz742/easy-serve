from datetime import date, timedelta
from decimal import Decimal
import pytz
from django.conf import settings
from django.db.models import Sum, Count, F, Q, DecimalField, ExpressionWrapper
from django.utils import timezone

from apps.restaurants.models import Orders, OrderItem
from apps.restaurants.constants import OrderStatus, PaymentStatus, OrderType, PaymentMethod
from apps.expenses.models import Expense
from apps.expenses.constants import ExpenseStatus, ExpensePaymentMethod
from apps.inventory.models import StockWastage
from apps.inventory.constants import WastageReason
from apps.financial.constants import (
    FinancialPeriodPreset,
    ReconciliationStatus,
    FOOD_COST_HEALTHY_MAX_PERCENT,
    FOOD_COST_WARNING_PERCENT,
    NET_MARGIN_HEALTHY_MIN_PERCENT,
)


class FinancialReportService:
    """
    Core Financial Intelligence and P&L aggregation engine for EasyServe.
    Aggregates directly from immutable source records (Orders, OrderItems,
    historical snapshotted COGS, active Expenses, and StockWastage).
    """

    @classmethod
    def get_local_now(cls):
        tz_name = getattr(settings, 'TIME_ZONE', 'Asia/Karachi')
        try:
            local_tz = pytz.timezone(tz_name)
            return timezone.now().astimezone(local_tz)
        except Exception:
            return timezone.now()

    @classmethod
    def resolve_period_dates(cls, preset=None, start_date=None, end_date=None):
        """
        Resolves (start_date, end_date, prev_start_date, prev_end_date, preset_name)
        in the restaurant's local business timezone.
        """
        now = cls.get_local_now()
        today = now.date()

        if start_date and end_date:
            if isinstance(start_date, str):
                start_date = date.fromisoformat(start_date)
            if isinstance(end_date, str):
                end_date = date.fromisoformat(end_date)
            duration = (end_date - start_date).days + 1
            prev_end = start_date - timedelta(days=1)
            prev_start = prev_end - timedelta(days=duration - 1)
            return start_date, end_date, prev_start, prev_end, FinancialPeriodPreset.CUSTOM.value

        preset_str = (preset or FinancialPeriodPreset.THIS_MONTH.value).lower()

        if preset_str == FinancialPeriodPreset.TODAY.value:
            start = today
            end = today
            prev_start = today - timedelta(days=1)
            prev_end = prev_start
        elif preset_str == FinancialPeriodPreset.YESTERDAY.value:
            start = today - timedelta(days=1)
            end = start
            prev_start = start - timedelta(days=1)
            prev_end = prev_start
        elif preset_str == FinancialPeriodPreset.THIS_WEEK.value:
            # Monday to Today
            start = today - timedelta(days=today.weekday())
            end = today
            duration = (end - start).days + 1
            prev_end = start - timedelta(days=1)
            prev_start = prev_end - timedelta(days=duration - 1)
        elif preset_str == FinancialPeriodPreset.LAST_WEEK.value:
            current_monday = today - timedelta(days=today.weekday())
            end = current_monday - timedelta(days=1)  # Last Sunday
            start = end - timedelta(days=6)          # Last Monday
            prev_end = start - timedelta(days=1)
            prev_start = prev_end - timedelta(days=6)
        elif preset_str == FinancialPeriodPreset.THIS_MONTH.value:
            start = today.replace(day=1)
            end = today
            # Previous month comparison
            last_day_prev_month = start - timedelta(days=1)
            prev_start = last_day_prev_month.replace(day=1)
            # Match day of month or last day
            prev_end_day = min(today.day, last_day_prev_month.day)
            prev_end = prev_start.replace(day=prev_end_day)
        elif preset_str == FinancialPeriodPreset.LAST_MONTH.value:
            first_of_this_month = today.replace(day=1)
            end = first_of_this_month - timedelta(days=1)
            start = end.replace(day=1)
            # Month before last
            first_of_last_month = start
            last_of_prev_prev = first_of_last_month - timedelta(days=1)
            prev_start = last_of_prev_prev.replace(day=1)
            prev_end = last_of_prev_prev
        elif preset_str == FinancialPeriodPreset.THIS_YEAR.value:
            start = today.replace(month=1, day=1)
            end = today
            prev_start = start.replace(year=start.year - 1)
            try:
                prev_end = end.replace(year=end.year - 1)
            except ValueError:  # Leap year handling
                prev_end = end.replace(year=end.year - 1, day=28)
        else:
            # Default to this month
            start = today.replace(day=1)
            end = today
            last_day_prev_month = start - timedelta(days=1)
            prev_start = last_day_prev_month.replace(day=1)
            prev_end_day = min(today.day, last_day_prev_month.day)
            prev_end = prev_start.replace(day=prev_end_day)
            preset_str = FinancialPeriodPreset.THIS_MONTH.value

        return start, end, prev_start, prev_end, preset_str

    @classmethod
    def get_restaurant_orders_queryset(cls, restaurant, start_date=None, end_date=None, valid_only=True):
        """
        Returns order queryset scoped to the restaurant and date range.
        Uses ordered_date with fallback to created_at.
        """
        qs = Orders.objects.filter(
            Q(table__restaurant=restaurant) |
            Q(dine_in_session__restaurant=restaurant) |
            Q(items__menu_item__menu__restaurant=restaurant)
        ).distinct()

        if valid_only:
            qs = qs.filter(
                order_cancelled=False,
                payment_status=PaymentStatus.CONFIRMED.value
            )

        if start_date and end_date:
            qs = qs.filter(
                Q(ordered_date__date__range=(start_date, end_date)) |
                Q(ordered_date__isnull=True, created_at__date__range=(start_date, end_date))
            )

        return qs

    @classmethod
    def calculate_overview(cls, restaurant, start_date, end_date, prev_start_date=None, prev_end_date=None, preset_name="custom"):
        """
        Calculates authoritative executive financial overview and P&L metrics.
        """
        # Current period orders
        current_orders = cls.get_restaurant_orders_queryset(restaurant, start_date, end_date, valid_only=True)
        order_stats = current_orders.aggregate(
            gross_revenue=Sum('total_price'),
            cogs=Sum('total_cogs'),
            order_count=Count('id')
        )

        gross_revenue = order_stats['gross_revenue'] or Decimal('0.00')
        discounts = Decimal('0.00')
        net_sales = gross_revenue - discounts
        cogs = order_stats['cogs'] or Decimal('0.00')
        order_count = order_stats['order_count'] or 0

        avg_order_value = (
            (net_sales / Decimal(order_count)).quantize(Decimal('0.01'))
            if order_count > 0 else Decimal('0.00')
        )

        # Gross Profit & Margin
        gross_profit = net_sales - cogs
        gross_margin = (
            ((gross_profit / net_sales) * Decimal('100.0')).quantize(Decimal('0.01'))
            if net_sales > 0 else Decimal('0.00')
        )

        # Operating Expenses (Phase 5: active non-voided expenses)
        active_expenses = Expense.objects.filter(
            restaurant=restaurant,
            status=ExpenseStatus.ACTIVE.value,
            expense_date__range=(start_date, end_date)
        )
        operating_expenses = active_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        expense_count = active_expenses.count()

        # Stock Wastage (Phase 4: operational loss)
        wastage_records = StockWastage.objects.filter(
            restaurant=restaurant,
            wastage_date__range=(start_date, end_date)
        )
        wastage_cost = wastage_records.aggregate(total=Sum('total_cost'))['total'] or Decimal('0.00')
        wastage_count = wastage_records.count()

        # Net Operating Result & Net Margin
        total_costs = cogs + wastage_cost + operating_expenses
        operating_result = gross_profit - wastage_cost - operating_expenses
        net_margin = (
            ((operating_result / net_sales) * Decimal('100.0')).quantize(Decimal('0.01'))
            if net_sales > 0 else Decimal('0.00')
        )

        # Food Cost Percentage (COGS / Net Sales)
        food_cost_percentage = (
            ((cogs / net_sales) * Decimal('100.0')).quantize(Decimal('0.01'))
            if net_sales > 0 else Decimal('0.00')
        )

        # Health status indicator based on objective commercial thresholds
        if net_sales > 0:
            if food_cost_percentage <= Decimal(str(FOOD_COST_HEALTHY_MAX_PERCENT)) and net_margin >= Decimal(str(NET_MARGIN_HEALTHY_MIN_PERCENT)):
                health_status = "HEALTHY"
            elif food_cost_percentage > Decimal(str(FOOD_COST_WARNING_PERCENT)) or net_margin < Decimal('0.00'):
                health_status = "ATTENTION"
            else:
                health_status = "MODERATE"
        else:
            health_status = "NO_ACTIVITY"

        # Prior period comparisons
        comparisons = None
        if prev_start_date and prev_end_date:
            prev_orders = cls.get_restaurant_orders_queryset(restaurant, prev_start_date, prev_end_date, valid_only=True)
            prev_stats = prev_orders.aggregate(
                gross_revenue=Sum('total_price'),
                cogs=Sum('total_cogs'),
                order_count=Count('id')
            )
            prev_revenue = prev_stats['gross_revenue'] or Decimal('0.00')
            prev_cogs = prev_stats['cogs'] or Decimal('0.00')
            prev_gross_profit = prev_revenue - prev_cogs
            prev_expenses = Expense.objects.filter(
                restaurant=restaurant,
                status=ExpenseStatus.ACTIVE.value,
                expense_date__range=(prev_start_date, prev_end_date)
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            prev_wastage = StockWastage.objects.filter(
                restaurant=restaurant,
                wastage_date__range=(prev_start_date, prev_end_date)
            ).aggregate(total=Sum('total_cost'))['total'] or Decimal('0.00')
            prev_operating_result = prev_gross_profit - prev_wastage - prev_expenses

            def calc_growth(current, previous):
                if previous and previous > 0:
                    growth = ((current - previous) / previous) * Decimal('100.0')
                    return float(growth.quantize(Decimal('0.1')))
                return None

            comparisons = {
                "previous_period": {
                    "start": prev_start_date.isoformat(),
                    "end": prev_end_date.isoformat(),
                },
                "revenue_growth_pct": calc_growth(net_sales, prev_revenue),
                "cogs_growth_pct": calc_growth(cogs, prev_cogs),
                "gross_profit_growth_pct": calc_growth(gross_profit, prev_gross_profit),
                "expenses_growth_pct": calc_growth(operating_expenses, prev_expenses),
                "operating_result_growth_pct": calc_growth(operating_result, prev_operating_result),
                "prev_revenue": prev_revenue,
                "prev_operating_result": prev_operating_result,
            }

        return {
            "period": {
                "preset": preset_name,
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
            "revenue": {
                "gross_sales": gross_revenue,
                "discounts": discounts,
                "net_sales": net_sales,
                "orders_count": order_count,
                "average_order_value": avg_order_value,
            },
            "costs": {
                "cogs": cogs,
                "food_cost_percentage": food_cost_percentage,
                "wastage": wastage_cost,
                "wastage_count": wastage_count,
                "operating_expenses": operating_expenses,
                "expense_count": expense_count,
                "total_costs": total_costs,
            },
            "profitability": {
                "gross_profit": gross_profit,
                "gross_margin": gross_margin,
                "operating_result": operating_result,
                "net_margin": net_margin,
                "health_status": health_status,
            },
            "comparisons": comparisons,
        }

    @classmethod
    def calculate_trends(cls, restaurant, start_date, end_date):
        """
        Calculates daily time-series financial trend data.
        """
        days_count = (end_date - start_date).days + 1
        trends = []

        # Bulk fetch data grouped by date for efficiency
        orders = cls.get_restaurant_orders_queryset(restaurant, start_date, end_date, valid_only=True)

        expenses = Expense.objects.filter(
            restaurant=restaurant,
            status=ExpenseStatus.ACTIVE.value,
            expense_date__range=(start_date, end_date)
        )

        wastages = StockWastage.objects.filter(
            restaurant=restaurant,
            wastage_date__range=(start_date, end_date)
        )

        for i in range(days_count):
            day = start_date + timedelta(days=i)
            day_orders = orders.filter(
                Q(ordered_date__date=day) |
                Q(ordered_date__isnull=True, created_at__date=day)
            ).aggregate(
                sales=Sum('total_price'),
                cogs=Sum('total_cogs'),
                orders=Count('id')
            )

            sales = day_orders['sales'] or Decimal('0.00')
            cogs = day_orders['cogs'] or Decimal('0.00')
            order_count = day_orders['orders'] or 0

            exp = expenses.filter(expense_date=day).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            wst = wastages.filter(wastage_date=day).aggregate(total=Sum('total_cost'))['total'] or Decimal('0.00')

            gross_profit = sales - cogs
            operating_result = gross_profit - exp - wst

            trends.append({
                "date": day.isoformat(),
                "day_label": day.strftime("%b %d"),
                "sales": sales,
                "cogs": cogs,
                "expenses": exp,
                "wastage": wst,
                "gross_profit": gross_profit,
                "operating_result": operating_result,
                "order_count": order_count,
            })

        return trends

    @classmethod
    def calculate_revenue_breakdown(cls, restaurant, start_date, end_date):
        """
        Calculates revenue breakdown by payment method and order type.
        """
        orders = cls.get_restaurant_orders_queryset(restaurant, start_date, end_date, valid_only=True)
        total_revenue = orders.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')

        # By Order Type
        order_types = []
        for o_type in OrderType:
            sub_qs = orders.filter(order_type=o_type.value)
            rev = sub_qs.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
            cnt = sub_qs.count()
            pct = (
                float(((rev / total_revenue) * Decimal('100.0')).quantize(Decimal('0.1')))
                if total_revenue > 0 else 0.0
            )
            order_types.append({
                "type_code": o_type.value,
                "type_name": o_type.label,
                "revenue": rev,
                "count": cnt,
                "percentage": pct,
            })

        # By Payment Method
        # Check PaymentDetails and orders
        payment_methods = []
        method_buckets = {
            "CASH": {"name": "Cash", "revenue": Decimal('0.00'), "count": 0},
            "CARD": {"name": "Card / Transfer", "revenue": Decimal('0.00'), "count": 0},
            "ONLINE": {"name": "Online / Digital", "revenue": Decimal('0.00'), "count": 0},
            "OTHER": {"name": "Other", "revenue": Decimal('0.00'), "count": 0},
        }

        for order in orders.select_related('table', 'dine_in_session'):
            # Determine payment method
            # Check attached PaymentDetails or Payment model if present
            pd = getattr(order, 'paymentdetails_set', None)
            pd_first = pd.first() if pd and pd.exists() else None
            p_rel = getattr(order, 'payment', None)

            if p_rel:
                m_str = (p_rel.method or "").lower()
                if "cash" in m_str:
                    bucket = "CASH"
                elif "card" in m_str:
                    bucket = "CARD"
                elif "online" in m_str:
                    bucket = "ONLINE"
                else:
                    bucket = "OTHER"
            elif pd_first:
                if pd_first.payment_method == PaymentMethod.CATCH_ON_DELIVERY.value:
                    bucket = "CASH"
                else:
                    bucket = "CARD"
            else:
                bucket = "CASH"

            method_buckets[bucket]["revenue"] += order.total_price
            method_buckets[bucket]["count"] += 1

        for code, bdata in method_buckets.items():
            pct = (
                float(((bdata["revenue"] / total_revenue) * Decimal('100.0')).quantize(Decimal('0.1')))
                if total_revenue > 0 else 0.0
            )
            payment_methods.append({
                "method_code": code,
                "method_name": bdata["name"],
                "revenue": bdata["revenue"],
                "count": bdata["count"],
                "percentage": pct,
            })

        return {
            "total_revenue": total_revenue,
            "by_order_type": order_types,
            "by_payment_method": payment_methods,
        }

    @classmethod
    def calculate_expense_breakdown(cls, restaurant, start_date, end_date):
        """
        Calculates active operating expense breakdown by category.
        """
        expenses = Expense.objects.filter(
            restaurant=restaurant,
            status=ExpenseStatus.ACTIVE.value,
            expense_date__range=(start_date, end_date)
        )
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        cat_groups = expenses.values(
            'category__id', 'category__name'
        ).annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        ).order_by('-total_amount')

        categories = []
        for g in cat_groups:
            amt = g['total_amount'] or Decimal('0.00')
            pct = (
                float(((amt / total_expenses) * Decimal('100.0')).quantize(Decimal('0.1')))
                if total_expenses > 0 else 0.0
            )
            categories.append({
                "category_id": g['category__id'],
                "name": g['category__name'] or "Uncategorized",
                "total_amount": amt,
                "count": g['count'],
                "percentage": pct,
            })

        return {
            "total_expenses": total_expenses,
            "categories": categories,
        }

    @classmethod
    def calculate_wastage_breakdown(cls, restaurant, start_date, end_date):
        """
        Calculates operational stock wastage breakdown by reason and top lost items.
        """
        wastages = StockWastage.objects.filter(
            restaurant=restaurant,
            wastage_date__range=(start_date, end_date)
        )
        total_wastage = wastages.aggregate(total=Sum('total_cost'))['total'] or Decimal('0.00')

        # Breakdown by Reason
        by_reason = []
        for r_choice in WastageReason:
            sub = wastages.filter(reason=r_choice.value)
            cost = sub.aggregate(total=Sum('total_cost'))['total'] or Decimal('0.00')
            cnt = sub.count()
            pct = (
                float(((cost / total_wastage) * Decimal('100.0')).quantize(Decimal('0.1')))
                if total_wastage > 0 else 0.0
            )
            by_reason.append({
                "reason_code": r_choice.value,
                "reason_name": r_choice.label,
                "total_cost": cost,
                "count": cnt,
                "percentage": pct,
            })

        # Top Wasted Items
        top_items_qs = wastages.values(
            'inventory_item__id',
            'inventory_item__name',
            'inventory_item__sku',
            'uom__short_code'
        ).annotate(
            total_cost=Sum('total_cost'),
            total_quantity=Sum('quantity'),
            incident_count=Count('id')
        ).order_by('-total_cost')[:10]

        top_items = []
        for item in top_items_qs:
            top_items.append({
                "item_id": item['inventory_item__id'],
                "name": item['inventory_item__name'],
                "sku": item['inventory_item__sku'],
                "uom": item['uom__short_code'] or "",
                "total_quantity": item['total_quantity'] or Decimal('0.00'),
                "total_cost": item['total_cost'] or Decimal('0.00'),
                "incident_count": item['incident_count'],
            })

        return {
            "total_wastage_cost": total_wastage,
            "by_reason": by_reason,
            "top_wasted_items": top_items,
        }

    @classmethod
    def calculate_product_performance(cls, restaurant, start_date, end_date, sort_by='revenue', limit=50):
        """
        Calculates menu item profitability, units sold, revenue, COGS, and food cost %.
        """
        orders = cls.get_restaurant_orders_queryset(restaurant, start_date, end_date, valid_only=True)

        items_qs = OrderItem.objects.filter(
            order__in=orders
        ).values(
            'menu_item__id',
            'menu_item__name',
            'menu_item__category__name'
        ).annotate(
            units_sold=Sum('quantity'),
            total_revenue=Sum(
                ExpressionWrapper(F('quantity') * F('price'), output_field=DecimalField(max_digits=12, decimal_places=2))
            ),
            total_cogs=Sum(
                ExpressionWrapper(F('quantity') * F('unit_cost_at_order'), output_field=DecimalField(max_digits=12, decimal_places=2))
            )
        )

        products = []
        for item in items_qs:
            rev = item['total_revenue'] or Decimal('0.00')
            cogs = item['total_cogs'] or Decimal('0.00')
            profit = rev - cogs
            units = item['units_sold'] or 0

            food_cost_pct = (
                float(((cogs / rev) * Decimal('100.0')).quantize(Decimal('0.1')))
                if rev > 0 else 0.0
            )
            margin_pct = (
                float(((profit / rev) * Decimal('100.0')).quantize(Decimal('0.1')))
                if rev > 0 else 0.0
            )

            # Explicit health status
            if food_cost_pct <= FOOD_COST_HEALTHY_MAX_PERCENT:
                status = "HEALTHY"
            elif food_cost_pct <= FOOD_COST_WARNING_PERCENT:
                status = "ATTENTION"
            else:
                status = "HIGH_COST"

            products.append({
                "menu_item_id": item['menu_item__id'],
                "name": item['menu_item__name'],
                "category": item['menu_item__category__name'] or "General",
                "units_sold": units,
                "revenue": rev,
                "cogs": cogs,
                "gross_profit": profit,
                "food_cost_percentage": food_cost_pct,
                "gross_margin_percentage": margin_pct,
                "status": status,
            })

        # Sorting
        if sort_by == 'units':
            products.sort(key=lambda x: x['units_sold'], reverse=True)
        elif sort_by == 'profit':
            products.sort(key=lambda x: x['gross_profit'], reverse=True)
        elif sort_by == 'food_cost':
            products.sort(key=lambda x: x['food_cost_percentage'], reverse=True)
        else:
            # Default by revenue
            products.sort(key=lambda x: x['revenue'], reverse=True)

        return products[:limit]

    @classmethod
    def calculate_reconciliation(cls, restaurant, start_date, end_date):
        """
        Performs multi-source financial audit reconciliation to detect discrepancies.
        """
        orders = cls.get_restaurant_orders_queryset(restaurant, start_date, end_date, valid_only=True)

        # 1. Revenue Reconciliation (Order.total_price vs Sum(OrderItem.price * quantity))
        orders_revenue = orders.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
        item_revenue = OrderItem.objects.filter(
            order__in=orders
        ).aggregate(
            total=Sum(
                ExpressionWrapper(F('quantity') * F('price'), output_field=DecimalField(max_digits=12, decimal_places=2))
            )
        )['total'] or Decimal('0.00')

        rev_diff = abs(orders_revenue - item_revenue)

        # 2. COGS Reconciliation (Order.total_cogs vs Sum(OrderItem.unit_cost_at_order * quantity))
        order_cogs = orders.aggregate(total=Sum('total_cogs'))['total'] or Decimal('0.00')
        item_cogs = OrderItem.objects.filter(
            order__in=orders
        ).aggregate(
            total=Sum(
                ExpressionWrapper(F('quantity') * F('unit_cost_at_order'), output_field=DecimalField(max_digits=12, decimal_places=2))
            )
        )['total'] or Decimal('0.00')

        cogs_diff = abs(order_cogs - item_cogs)

        # 3. Expense Reconciliation (Active Expense Records Sum vs Category Aggregation)
        active_expenses = Expense.objects.filter(
            restaurant=restaurant,
            status=ExpenseStatus.ACTIVE.value,
            expense_date__range=(start_date, end_date)
        )
        total_expenses = active_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        cat_expense_total = active_expenses.values('category').annotate(
            total=Sum('amount')
        ).aggregate(grand_total=Sum('total'))['grand_total'] or Decimal('0.00')

        exp_diff = abs(total_expenses - cat_expense_total)

        # 4. Wastage Reconciliation (StockWastage Records Sum vs Reason Aggregation)
        wastages = StockWastage.objects.filter(
            restaurant=restaurant,
            wastage_date__range=(start_date, end_date)
        )
        total_wastage = wastages.aggregate(total=Sum('total_cost'))['total'] or Decimal('0.00')
        reason_wastage_total = wastages.values('reason').annotate(
            total=Sum('total_cost')
        ).aggregate(grand_total=Sum('total'))['grand_total'] or Decimal('0.00')

        wst_diff = abs(total_wastage - reason_wastage_total)

        is_reconciled = (rev_diff == 0 and cogs_diff == 0 and exp_diff == 0 and wst_diff == 0)

        return {
            "reconciliation_status": ReconciliationStatus.RECONCILED.value if is_reconciled else ReconciliationStatus.DISCREPANCY_DETECTED.value,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
            "revenue_audit": {
                "orders_revenue": orders_revenue,
                "order_items_revenue": item_revenue,
                "difference": rev_diff,
                "is_reconciled": rev_diff == 0,
            },
            "cogs_audit": {
                "order_cogs_total": order_cogs,
                "item_level_cogs_total": item_cogs,
                "difference": cogs_diff,
                "is_reconciled": cogs_diff == 0,
            },
            "expense_audit": {
                "active_expenses_total": total_expenses,
                "category_aggregation_total": cat_expense_total,
                "difference": exp_diff,
                "is_reconciled": exp_diff == 0,
            },
            "wastage_audit": {
                "total_wastage_cost": total_wastage,
                "reason_aggregation_total": reason_wastage_total,
                "difference": wst_diff,
                "is_reconciled": wst_diff == 0,
            }
        }
