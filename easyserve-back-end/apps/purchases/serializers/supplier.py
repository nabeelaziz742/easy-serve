from rest_framework import serializers
from apps.purchases.models import Supplier, PurchaseOrder


class SupplierSerializer(serializers.ModelSerializer):
    purchase_count = serializers.SerializerMethodField()
    last_purchase_date = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = [
            'id',
            'name',
            'contact_person',
            'phone',
            'email',
            'address',
            'notes',
            'is_active',
            'purchase_count',
            'last_purchase_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_purchase_count(self, obj):
        return obj.purchase_orders.count()

    def get_last_purchase_date(self, obj):
        last_po = obj.purchase_orders.order_by('-purchase_date', '-id').first()
        return last_po.purchase_date.isoformat() if last_po and last_po.purchase_date else None

    def validate_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Supplier name cannot be empty.")

        restaurant = self.context.get('restaurant')
        if restaurant:
            qs = Supplier.objects.filter(restaurant=restaurant, name__iexact=val)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError("A supplier with this name already exists for your restaurant.")
        return val
