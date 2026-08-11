from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet

from apps.restaurants.models import Category
from apps.restaurants.serializers.category import CategorySerializer
from utils.permissions import IsRestaurantOwner


class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsRestaurantOwner()]

    def get_queryset(self):
        restaurant_id = self.request.query_params.get('restaurant_id')
        if restaurant_id:
            return Category.objects.filter(restaurant_id=restaurant_id)
        return super().get_queryset()