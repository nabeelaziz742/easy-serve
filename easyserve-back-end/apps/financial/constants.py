from django.db import models


class FinancialPeriodPreset(models.TextChoices):
    TODAY = "today", "Today"
    YESTERDAY = "yesterday", "Yesterday"
    THIS_WEEK = "this_week", "This Week"
    LAST_WEEK = "last_week", "Last Week"
    THIS_MONTH = "this_month", "This Month"
    LAST_MONTH = "last_month", "Last Month"
    THIS_YEAR = "this_year", "This Year"
    CUSTOM = "custom", "Custom"


class ReconciliationStatus(models.TextChoices):
    RECONCILED = "RECONCILED", "Reconciled"
    DISCREPANCY_DETECTED = "DISCREPANCY_DETECTED", "Discrepancy Detected"


# Financial Health Benchmarks (Commercial Restaurant Standards)
FOOD_COST_HEALTHY_MAX_PERCENT = 35.0   # <= 35% is considered healthy in food service
FOOD_COST_WARNING_PERCENT = 45.0       # > 45% requires attention
NET_MARGIN_HEALTHY_MIN_PERCENT = 15.0  # >= 15% is healthy operating net margin
