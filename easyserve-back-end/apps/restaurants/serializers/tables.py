from rest_framework import serializers
from apps.restaurants.models import Table


class TableSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)

    class Meta:
        model = Table
        fields = [
            "id",
            "restaurant",
            "restaurant_name",
            "table_number",
            "qr_code",
            "created_at",
            "updated_at",
        ]