from rest_framework import serializers
from apps.inventory.models import UnitOfMeasure


class UnitOfMeasureSerializer(serializers.ModelSerializer):
    base_unit_name = serializers.ReadOnlyField(source='base_unit.name')
    base_unit_short_code = serializers.ReadOnlyField(source='base_unit.short_code')

    class Meta:
        model = UnitOfMeasure
        fields = [
            'id',
            'restaurant',
            'name',
            'short_code',
            'base_unit',
            'base_unit_name',
            'base_unit_short_code',
            'conversion_factor',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'restaurant']
