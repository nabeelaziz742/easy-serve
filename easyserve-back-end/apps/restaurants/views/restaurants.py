from django.db.models import Q
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.restaurants.models import Restaurant
from apps.restaurants.serializers import (
    RestaurantSerializer,
    RestaurantImageSerializer
)
from utils.permissions import IsSuperAdmin
from utils.notifications import create_notification


class RestaurantViewSet(ModelViewSet):
    """
    A ViewSet to list, create, retrieve, update, and delete restaurants.
    """
    queryset = Restaurant.objects.all()
    serializer_class = RestaurantSerializer
    pagination_class = None  # Disable pagination for this ViewSet

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        # only admins can create, update, delete
        return [IsSuperAdmin()]

    # ✅ Trigger notification when restaurant is created
    def perform_create(self, serializer):
        instance = serializer.save()
        # Notify all restaurant owners or admins
        create_notification(
            profile=self.request.user.profile,
            # title="New Restaurant Created",
            message=f"A new restaurant '{instance.name}' has been added."
        )

    # ✅ Trigger notification when restaurant is updated
    def perform_update(self, serializer):
        instance = serializer.save()
        create_notification(
            profile=self.request.user.profile,
            # title="Restaurant Updated",
            message=f"Restaurant '{instance.name}' has been updated."
        )

    # ✅ Trigger notification when restaurant is deleted
    def perform_destroy(self, instance):
        restaurant_name = instance.name
        instance.delete()
        create_notification(
            profile=self.request.user.profile,
            # title="Restaurant Deleted",
            message=f"The restaurant '{restaurant_name}' has been deleted."
        )

    @action(detail=True, methods=['post','put'], permission_classes=[IsSuperAdmin])
    def update_image(self, request, pk=None):
        """Custom endpoint for uploading a restaurant image"""
        restaurant = get_object_or_404(Restaurant, pk=pk)
        serializer = RestaurantImageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(restaurant=restaurant)

        # ✅ Notify about image update
        create_notification(
            profile=self.request.user.profile,
            # title="Restaurant Image Updated",
            message=f"The image for restaurant '{restaurant.name}' has been updated."
        )

        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsSuperAdmin], url_path="lite")
    def lite(self, request):
        qs = Restaurant.objects.only("id", "name").order_by("name")

        search_query = request.query_params.get("search")
        if search_query:
            qs = qs.filter(Q(name__icontains=search_query))[:10]
        else:
            qs = qs[:10]  # default also capped at 10

        data = [{"id": r.id, "name": r.name} for r in qs]
        # serializer = RestaurantSerializer(qs, many=True)
        return Response(data)
