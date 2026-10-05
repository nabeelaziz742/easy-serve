from rest_framework import serializers
from apps.inventory.models import InventoryCategory


class InventoryCategorySerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = InventoryCategory
        fields = [
            'id',
            'restaurant',
            'name',
            'description',
            'is_active',
            'items_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'restaurant']

    def get_items_count(self, obj):
        return obj.items.filter(is_active=True).count()
