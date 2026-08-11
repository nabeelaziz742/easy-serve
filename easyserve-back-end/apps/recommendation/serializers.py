from rest_framework import serializers
from apps.restaurants.models import MenuItem

class RecommendedMenuItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    ingredients = serializers.CharField()

    class Meta:
        model=MenuItem

        fields = ['id', 'name', 'ingredients']
