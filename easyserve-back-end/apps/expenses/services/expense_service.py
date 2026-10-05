from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Count, Avg, F, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.expenses.constants import ExpenseStatus, ExpensePaymentMethod
from apps.expenses.models import Expense, ExpenseCategory


class ExpenseService:
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

        # Manager
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
    def create_expense(restaurant, validated_data, user_profile):
        """
        Creates an Expense record with strict restaurant validation and decimal safety.
        """
        if not restaurant:
            raise ValidationError("Restaurant context is required.")

        category = validated_data.get('category')
        if category and category.restaurant_id != restaurant.id:
            raise ValidationError("The selected expense category does not belong to your restaurant.")

        amount = validated_data.get('amount')
        if amount is None or Decimal(str(amount)) <= Decimal('0.00'):
            raise ValidationError("Expense amount must be strictly greater than zero.")

        expense = Expense.objects.create(
            restaurant=restaurant,
            created_by=user_profile,
            **validated_data
        )
        return expense

    @staticmethod
    @transaction.atomic
    def update_expense(expense, validated_data, user_profile):
        """
        Updates an existing active Expense record.
        """
        if expense.status == ExpenseStatus.VOIDED.value:
            raise ValidationError("Cannot modify a voided expense record.")

        category = validated_data.get('category')
        if category and category.restaurant_id != expense.restaurant_id:
            raise ValidationError("The selected expense category does not belong to this restaurant.")

        amount = validated_data.get('amount')
        if amount is not None and Decimal(str(amount)) <= Decimal('0.00'):
            raise ValidationError("Expense amount must be strictly greater than zero.")

        for attr, value in validated_data.items():
            setattr(expense, attr, value)

        expense.save()
        return expense

    @staticmethod
    @transaction.atomic
    def void_expense(expense, void_reason, user_profile):
        """
        Voids an expense record while preserving complete audit history.
        """
        if expense.status == ExpenseStatus.VOIDED.value:
            raise ValidationError("This expense has already been voided.")

        reason_str = (void_reason or '').strip()
        if not reason_str:
            raise ValidationError("A clear void reason is required to void an expense.")

        expense.status = ExpenseStatus.VOIDED.value
        expense.void_reason = reason_str
        expense.voided_by = user_profile
        expense.voided_at = timezone.now()
        expense.save(update_fields=['status', 'void_reason', 'voided_by', 'voided_at', 'updated_at'])
        return expense

    @staticmethod
    def get_expense_summary(restaurant, start_date=None, end_date=None):
        """
        Aggregates live database metrics for restaurant operating expenses based on expense_date.
        Excludes voided records from financial totals.
        """
        if not restaurant:
            return {
                "today_total": "0.00",
                "this_week_total": "0.00",
                "this_month_total": "0.00",
                "filter_total": "0.00",
                "active_count": 0,
                "voided_count": 0,
                "average_expense": "0.00",
            }

        today = timezone.now().date()
        start_of_week = today - timedelta(days=today.weekday())
        start_of_month = today.replace(day=1)

        active_qs = Expense.objects.filter(
            restaurant=restaurant,
            status=ExpenseStatus.ACTIVE.value
        )

        today_total = active_qs.filter(expense_date=today).aggregate(
            val=Sum('amount')
        )['val'] or Decimal('0.00')

        week_total = active_qs.filter(expense_date__gte=start_of_week).aggregate(
            val=Sum('amount')
        )['val'] or Decimal('0.00')

        month_total = active_qs.filter(expense_date__gte=start_of_month).aggregate(
            val=Sum('amount')
        )['val'] or Decimal('0.00')

        # Custom date range filter total if provided
        filtered_qs = active_qs
        if start_date:
            filtered_qs = filtered_qs.filter(expense_date__gte=start_date)
        if end_date:
            filtered_qs = filtered_qs.filter(expense_date__lte=end_date)

        filter_total = filtered_qs.aggregate(val=Sum('amount'))['val'] or Decimal('0.00')
        active_count = filtered_qs.count()
        avg_amount = filtered_qs.aggregate(val=Avg('amount'))['val'] or Decimal('0.00')

        voided_count = Expense.objects.filter(
            restaurant=restaurant,
            status=ExpenseStatus.VOIDED.value
        ).count()

        return {
            "today_total": str(today_total.quantize(Decimal('0.01'))),
            "this_week_total": str(week_total.quantize(Decimal('0.01'))),
            "this_month_total": str(month_total.quantize(Decimal('0.01'))),
            "filter_total": str(filter_total.quantize(Decimal('0.01'))),
            "active_count": active_count,
            "voided_count": voided_count,
            "average_expense": str(avg_amount.quantize(Decimal('0.01'))),
        }

    @staticmethod
    def get_expense_breakdown(restaurant, start_date=None, end_date=None):
        """
        Calculates category breakdown, payment method distribution, and daily trend.
        """
        if not restaurant:
            return {
                "categories": [],
                "payment_methods": [],
                "daily_trend": [],
                "total_amount": "0.00",
            }

        active_qs = Expense.objects.filter(
            restaurant=restaurant,
            status=ExpenseStatus.ACTIVE.value
        )

        if start_date:
            active_qs = active_qs.filter(expense_date__gte=start_date)
        if end_date:
            active_qs = active_qs.filter(expense_date__lte=end_date)

        grand_total = active_qs.aggregate(val=Sum('amount'))['val'] or Decimal('0.00')

        # 1. Category Distribution
        cat_agg = (
            active_qs.values('category__id', 'category__name')
            .annotate(
                total_amount=Sum('amount'),
                count=Count('id')
            )
            .order_by('-total_amount')
        )

        categories_data = []
        for c in cat_agg:
            amt = c['total_amount'] or Decimal('0.00')
            pct = (amt / grand_total * Decimal('100.0')) if grand_total > Decimal('0.00') else Decimal('0.0')
            categories_data.append({
                "category_id": c['category__id'],
                "category_name": c['category__name'] or "Uncategorized",
                "total_amount": str(amt.quantize(Decimal('0.01'))),
                "percentage": float(pct.quantize(Decimal('0.1'))),
                "count": c['count'],
            })

        # 2. Payment Method Distribution
        pay_agg = (
            active_qs.values('payment_method')
            .annotate(
                total_amount=Sum('amount'),
                count=Count('id')
            )
            .order_by('-total_amount')
        )

        pay_map = dict(ExpensePaymentMethod.model_choices())
        payment_methods_data = []
        for p in pay_agg:
            amt = p['total_amount'] or Decimal('0.00')
            pct = (amt / grand_total * Decimal('100.0')) if grand_total > Decimal('0.00') else Decimal('0.0')
            payment_methods_data.append({
                "payment_method": p['payment_method'],
                "payment_method_label": pay_map.get(p['payment_method'], "Other"),
                "total_amount": str(amt.quantize(Decimal('0.01'))),
                "percentage": float(pct.quantize(Decimal('0.1'))),
                "count": p['count'],
            })

        # 3. Daily Trend (last 14 active days or custom range)
        daily_agg = (
            active_qs.values('expense_date')
            .annotate(total_amount=Sum('amount'), count=Count('id'))
            .order_by('expense_date')
        )
        daily_trend = [
            {
                "date": str(d['expense_date']),
                "total_amount": str(d['total_amount'].quantize(Decimal('0.01'))),
                "count": d['count'],
            }
            for d in daily_agg
        ]

        return {
            "categories": categories_data,
            "payment_methods": payment_methods_data,
            "daily_trend": daily_trend,
            "total_amount": str(grand_total.quantize(Decimal('0.01'))),
        }
