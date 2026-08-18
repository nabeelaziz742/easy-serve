from django.db import transaction
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

    def _notify(self, message):
        """Create an admin notification when a profile exists."""
        profile = getattr(self.request.user, "profile", None)
        if profile is not None:
            create_notification(profile=profile, message=message)

    # Trigger notification when restaurant is created
    def perform_create(self, serializer):
        with transaction.atomic():
            instance = serializer.save()
            self._notify(
                f"A new restaurant '{instance.name}' has been added."
            )

    # Trigger notification when restaurant is updated
    def perform_update(self, serializer):
        with transaction.atomic():
            instance = serializer.save()
            self._notify(
                f"Restaurant '{instance.name}' has been updated."
            )

    # Trigger notification when restaurant is deleted
    def perform_destroy(self, instance):
        with transaction.atomic():
            restaurant_name = instance.name
            instance.delete()
            self._notify(
                f"Restaurant '{restaurant_name}' has been deleted."
            )

    @action(detail=True, methods=['post', 'put'], permission_classes=[IsSuperAdmin])
    def update_image(self, request, pk=None):
        """Custom endpoint for uploading a restaurant image"""
        restaurant = get_object_or_404(Restaurant, pk=pk)
        serializer = RestaurantImageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            serializer.save(restaurant=restaurant)
            self._notify(
                f"The image for restaurant '{restaurant.name}' has been updated."
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
        return Response(data)
