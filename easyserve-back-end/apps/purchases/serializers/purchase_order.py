from decimal import Decimal
from rest_framework import serializers

from apps.inventory.models import InventoryItem
from apps.purchases.models import Supplier, PurchaseOrder, PurchaseOrderItem
from apps.purchases.constants import PurchaseStatus


class PurchaseOrderItemReadSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='inventory_item.name', read_only=True)
    item_sku = serializers.CharField(source='inventory_item.sku', read_only=True)
    unit_code = serializers.CharField(source='inventory_item.uom.short_code', read_only=True)
    current_item_stock = serializers.DecimalField(
        source='inventory_item.current_stock',
        max_digits=12,
        decimal_places=3,
        read_only=True
    )
    current_cost_per_unit = serializers.DecimalField(
        source='inventory_item.cost_per_unit',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id',
            'inventory_item',
            'item_name',
            'item_sku',
            'unit_code',
            'quantity',
            'unit_cost',
            'total_cost',
            'current_item_stock',
            'current_cost_per_unit',
        ]
        read_only_fields = ['id', 'total_cost']


class PurchaseOrderItemWriteSerializer(serializers.Serializer):
    inventory_item_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = serializers.DecimalField(max_digits=10, decimal_places=2)

    def validate_quantity(self, value):
        if value <= Decimal('0'):
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_unit_cost(self, value):
        if value < Decimal('0'):
            raise serializers.ValidationError("Unit cost cannot be negative.")
        return value


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id',
            'purchase_number',
            'supplier',
            'supplier_name',
            'invoice_number',
            'purchase_date',
            'status',
            'status_display',
            'subtotal',
            'tax_amount',
            'total_amount',
            'receipt_image',
            'notes',
            'items_count',
            'created_by_name',
            'received_by_name',
            'received_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_items_count(self, obj):
        return obj.items.count()

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "System"
        prof = obj.created_by
        name = f"{getattr(prof, 'first_name', '') or ''} {getattr(prof, 'last_name', '') or ''}".strip()
        if name:
            return name
        return getattr(prof.user, 'username', 'User') if getattr(prof, 'user', None) else "User"

    def get_received_by_name(self, obj):
        if not obj.received_by:
            return None
        prof = obj.received_by
        name = f"{getattr(prof, 'first_name', '') or ''} {getattr(prof, 'last_name', '') or ''}".strip()
        if name:
            return name
        return getattr(prof.user, 'username', 'User') if getattr(prof, 'user', None) else "User"


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_contact = serializers.CharField(source='supplier.contact_person', read_only=True)
    supplier_phone = serializers.CharField(source='supplier.phone', read_only=True)
    supplier_email = serializers.CharField(source='supplier.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items = PurchaseOrderItemReadSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id',
            'purchase_number',
            'supplier',
            'supplier_name',
            'supplier_contact',
            'supplier_phone',
            'supplier_email',
            'invoice_number',
            'purchase_date',
            'status',
            'status_display',
            'subtotal',
            'tax_amount',
            'total_amount',
            'receipt_image',
            'notes',
            'items',
            'created_by_name',
            'received_by_name',
            'received_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "System"
        prof = obj.created_by
        name = f"{getattr(prof, 'first_name', '') or ''} {getattr(prof, 'last_name', '') or ''}".strip()
        return name or (getattr(prof.user, 'username', 'User') if getattr(prof, 'user', None) else "User")

    def get_received_by_name(self, obj):
        if not obj.received_by:
            return None
        prof = obj.received_by
        name = f"{getattr(prof, 'first_name', '') or ''} {getattr(prof, 'last_name', '') or ''}".strip()
        return name or (getattr(prof.user, 'username', 'User') if getattr(prof, 'user', None) else "User")


class PurchaseOrderCreateUpdateSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemWriteSerializer(many=True, write_only=True)
    supplier_id = serializers.IntegerField(write_only=True)
    purchase_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id',
            'supplier_id',
            'purchase_number',
            'invoice_number',
            'purchase_date',
            'tax_amount',
            'receipt_image',
            'notes',
            'items',
        ]
        read_only_fields = ['id']

    def validate_supplier_id(self, value):
        restaurant = self.context.get('restaurant')
        if not restaurant:
            raise serializers.ValidationError("No active restaurant context.")
        try:
            supplier = Supplier.objects.get(id=value, restaurant=restaurant)
        except Supplier.DoesNotExist:
            raise serializers.ValidationError("Supplier not found for this restaurant.")
        if not supplier.is_active:
            raise serializers.ValidationError("Cannot create purchase orders with an inactive supplier.")
        return supplier

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one purchase item is required.")

        restaurant = self.context.get('restaurant')
        item_ids = [entry['inventory_item_id'] for entry in value]

        if len(item_ids) != len(set(item_ids)):
            raise serializers.ValidationError("Duplicate inventory items detected in purchase lines.")

        items = InventoryItem.objects.filter(id__in=item_ids, restaurant=restaurant, is_active=True)
        found_map = {itm.id: itm for itm in items}

        validated_items = []
        for entry in value:
            itm_id = entry['inventory_item_id']
            if itm_id not in found_map:
                raise serializers.ValidationError(f"Inventory item ID {itm_id} is invalid or inactive for this restaurant.")
            validated_items.append({
                'inventory_item': found_map[itm_id],
                'quantity': entry['quantity'],
                'unit_cost': entry['unit_cost'],
            })

        return validated_items
