from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet

from apps.restaurants.models import MenuItem
from apps.restaurants.serializers import MenuItemSerializer
from utils.permissions import IsRestaurantOwner


class MenuItemViewSet(ModelViewSet):
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsRestaurantOwner()]

    def get_queryset(self):
        menu_id = self.request.query_params.get("menu_id")

        queryset = MenuItem.objects.all()

        if menu_id:
            queryset = queryset.filter(menu_id=menu_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()