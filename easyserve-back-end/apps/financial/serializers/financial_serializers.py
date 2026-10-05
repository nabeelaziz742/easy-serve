from rest_framework import serializers


class PeriodSerializer(serializers.Serializer):
    preset = serializers.CharField(required=False)
    start = serializers.DateField()
    end = serializers.DateField()


class RevenueOverviewSerializer(serializers.Serializer):
    gross_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    discounts = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    orders_count = serializers.IntegerField()
    average_order_value = serializers.DecimalField(max_digits=12, decimal_places=2)


class CostOverviewSerializer(serializers.Serializer):
    cogs = serializers.DecimalField(max_digits=12, decimal_places=2)
    food_cost_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    wastage = serializers.DecimalField(max_digits=12, decimal_places=2)
    wastage_count = serializers.IntegerField()
    operating_expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    expense_count = serializers.IntegerField()
    total_costs = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProfitabilityOverviewSerializer(serializers.Serializer):
    gross_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    gross_margin = serializers.DecimalField(max_digits=5, decimal_places=2)
    operating_result = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_margin = serializers.DecimalField(max_digits=5, decimal_places=2)
    health_status = serializers.CharField()


class FinancialOverviewResponseSerializer(serializers.Serializer):
    period = PeriodSerializer()
    revenue = RevenueOverviewSerializer()
    costs = CostOverviewSerializer()
    profitability = ProfitabilityOverviewSerializer()
    comparisons = serializers.DictField(required=False, allow_null=True)


class FinancialTrendItemSerializer(serializers.Serializer):
    date = serializers.DateField()
    day_label = serializers.CharField()
    sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    cogs = serializers.DecimalField(max_digits=12, decimal_places=2)
    expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    wastage = serializers.DecimalField(max_digits=12, decimal_places=2)
    gross_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    operating_result = serializers.DecimalField(max_digits=12, decimal_places=2)
    order_count = serializers.IntegerField()


class ProductPerformanceItemSerializer(serializers.Serializer):
    menu_item_id = serializers.IntegerField()
    name = serializers.CharField()
    category = serializers.CharField()
    units_sold = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    cogs = serializers.DecimalField(max_digits=12, decimal_places=2)
    gross_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    food_cost_percentage = serializers.FloatField()
    gross_margin_percentage = serializers.FloatField()
    status = serializers.CharField()
