from decimal import Decimal
from rest_framework import serializers
from apps.expenses.models import Expense, ExpenseCategory
from apps.expenses.constants import ExpensePaymentMethod, ExpenseStatus


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    voided_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id',
            'restaurant',
            'category',
            'category_name',
            'expense_number',
            'title',
            'amount',
            'expense_date',
            'payment_method',
            'payment_method_display',
            'vendor_payee',
            'reference_number',
            'notes',
            'receipt',
            'status',
            'status_display',
            'void_reason',
            'voided_by',
            'voided_by_name',
            'voided_at',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'restaurant',
            'expense_number',
            'status',
            'void_reason',
            'voided_by',
            'voided_at',
            'created_by',
            'created_at',
            'updated_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            prof = obj.created_by
            full = f"{getattr(prof, 'first_name', '') or ''} {getattr(prof, 'last_name', '') or ''}".strip()
            if full:
                return full
            if getattr(prof, 'user', None):
                return getattr(prof.user, 'username', None) or getattr(prof.user, 'email', None) or "User"
        return "System"

    def get_voided_by_name(self, obj):
        if obj.voided_by:
            prof = obj.voided_by
            full = f"{getattr(prof, 'first_name', '') or ''} {getattr(prof, 'last_name', '') or ''}".strip()
            if full:
                return full
            if getattr(prof, 'user', None):
                return getattr(prof.user, 'username', None) or getattr(prof.user, 'email', None) or "User"
        return None


class ExpenseCreateUpdateSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'), required=True)

    class Meta:
        model = Expense
        fields = [
            'category',
            'title',
            'amount',
            'expense_date',
            'payment_method',
            'vendor_payee',
            'reference_number',
            'notes',
            'receipt',
        ]

    def validate_title(self, value):
        val = (value or '').strip()
        if not val:
            raise serializers.ValidationError("Expense title is required.")
        return val


class ExpenseVoidSerializer(serializers.Serializer):
    void_reason = serializers.CharField(required=True, min_length=3, allow_blank=False)
