from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
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

    def _assert_restaurant_access(self, restaurant):
        # Same ownership pattern used by MenuViewSet/MenuItemViewSet. The
        # role-only IsRestaurantOwner permission check does not verify
        # *which* restaurant the requester may touch, so this must be
        # checked explicitly before any create/update/delete.
        user = self.request.user
        if not user.is_authenticated or restaurant is None:
            raise PermissionDenied("You do not have access to this restaurant.")

        allowed = (
            restaurant.owners.filter(user_id=user.id).exists()
            or restaurant.waiters.filter(user_id=user.id).exists()
        )
        if not allowed:
            raise PermissionDenied("You do not have access to this restaurant.")

    def perform_create(self, serializer):
        restaurant = serializer.validated_data.get("restaurant")
        self._assert_restaurant_access(restaurant)
        serializer.save()

    def perform_update(self, serializer):
        self._assert_restaurant_access(serializer.instance.restaurant)
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_restaurant_access(instance.restaurant)
        instance.delete()