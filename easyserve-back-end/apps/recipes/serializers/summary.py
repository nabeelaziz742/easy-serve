from rest_framework import serializers


class RecipeSummarySerializer(serializers.Serializer):
    total_recipes = serializers.IntegerField()
    active_recipes = serializers.IntegerField()
    menu_items_with_recipes_count = serializers.IntegerField()
    menu_items_without_recipes_count = serializers.IntegerField()
    avg_food_cost_percentage = serializers.CharField()
    low_stock_recipes_count = serializers.IntegerField()
