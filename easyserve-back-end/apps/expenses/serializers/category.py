from rest_framework import serializers
from apps.expenses.models import ExpenseCategory


class ExpenseCategorySerializer(serializers.ModelSerializer):
    expense_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = ExpenseCategory
        fields = [
            'id',
            'restaurant',
            'name',
            'description',
            'is_active',
            'expense_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        val = (value or '').strip()
        if not val:
            raise serializers.ValidationError("Category name cannot be blank.")
        return val
