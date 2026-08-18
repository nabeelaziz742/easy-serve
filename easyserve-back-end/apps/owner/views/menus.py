from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.restaurants.models import Menu, Restaurant
from apps.restaurants.serializers import (
    MenuSerializer,
    FullMenuSerializer,
    FullMenuItemSerializer,
    MenuItemIngredientSerializer,
)

from utils.notifications import create_notification
from utils.permissions import IsRestaurantOwner


class MenuViewSet(ModelViewSet):
    queryset = Menu.objects.select_related("restaurant").all()
    serializer_class = MenuSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsRestaurantOwner()]

    def _assert_restaurant_access(self, restaurant):
        user = self.request.user
        if not user.is_authenticated:
            raise PermissionDenied("Authentication required.")

        allowed = (
            restaurant.owners.filter(user_id=user.id).exists()
            or restaurant.waiters.filter(user_id=user.id).exists()
        )
        if not allowed:
            raise PermissionDenied("You do not have access to this restaurant.")

    def _notify(self, message):
        profile = getattr(self.request.user, "profile", None)
        create_notification(profile=profile, message=message)

    def get_queryset(self):
        restaurant_id = self.request.query_params.get('restaurant_id')
        queryset = super().get_queryset()

        if restaurant_id:
            queryset = queryset.filter(restaurant_id=restaurant_id)

        return queryset

    def perform_create(self, serializer):
        restaurant = serializer.validated_data.get("restaurant")
        self._assert_restaurant_access(restaurant)

        with transaction.atomic():
            instance = serializer.save()
            self._notify(
                f"New menu '{instance.name}' created for restaurant '{instance.restaurant.name}'."
            )

    def perform_update(self, serializer):
        self._assert_restaurant_access(serializer.instance.restaurant)

        with transaction.atomic():
            instance = serializer.save()
            self._notify(
                f"Menu '{instance.name}' updated for restaurant '{instance.restaurant.name}'."
            )

    def perform_destroy(self, instance):
        self._assert_restaurant_access(instance.restaurant)
        menu_name = instance.name
        restaurant_name = instance.restaurant.name

        with transaction.atomic():
            instance.delete()
            self._notify(
                f"Menu '{menu_name}' deleted from restaurant '{restaurant_name}'."
            )

    @action(detail=False, methods=['get'], url_path='have-menu', permission_classes=[AllowAny])
    def have_menu(self, request):
        menu_name = request.query_params.get('menu_name')
        restaurant_id = request.query_params.get('restaurant_id')

        if not menu_name or not restaurant_id:
            return Response({"error": "Both 'menu_name' and 'restaurant_id' are required."}, status=400)

        exists = Menu.objects.filter(name=menu_name, restaurant_id=restaurant_id).exists()
        return Response(exists, status=200)

    @transaction.atomic
    @action(detail=False, methods=['post'], url_path='full_create')
    def full_create(self, request):
        name = request.data.get("name")
        description = request.data.get("description", "")
        restaurant_id = request.data.get("restaurant")

        if not restaurant_id:
            return Response({"error": "Restaurant ID is required."}, status=400)
        if not name:
            return Response({"error": "Menu name is required."}, status=400)

        restaurant = Restaurant.objects.filter(id=restaurant_id).first()
        if not restaurant:
            return Response({"error": "Restaurant not found."}, status=404)

        self._assert_restaurant_access(restaurant)

        menu_data = {"restaurant": restaurant.id, "name": name, "description": description}
        menu_serializer = FullMenuSerializer(data=menu_data)
        menu_serializer.is_valid(raise_exception=True)
        menu = menu_serializer.save()

        items = []
        i = 0
        while f"items[{i}][name]" in request.data:
            item_data = {
                "menu": menu.id,
                "name": request.data.get(f"items[{i}][name]"),
                "description": request.data.get(f"items[{i}][description]", ""),
                "price": request.data.get(f"items[{i}][price]", 0),
                "category": request.data.get(f"items[{i}][category]"),
            }

            file_key = f"items[{i}][image]"
            if file_key in request.FILES:
                item_data["image"] = request.FILES[file_key]

            item_serializer = FullMenuItemSerializer(data=item_data)
            item_serializer.is_valid(raise_exception=True)
            menu_item = item_serializer.save()

            j = 0
            while f"items[{i}][ingredients][{j}][name]" in request.data:
                ingredient_data = {
                    "menu_item": menu_item.id,
                    "name": request.data.get(f"items[{i}][ingredients][{j}][name]"),
                    "quantity": request.data.get(f"items[{i}][ingredients][{j}][quantity]", ""),
                    "description": request.data.get(f"items[{i}][ingredients][{j}][description]", ""),
                }

                ingredient_file_key = f"items[{i}][ingredients][{j}][image]"
                if ingredient_file_key in request.FILES:
                    ingredient_data["image"] = request.FILES[ingredient_file_key]

                ingredient_serializer = MenuItemIngredientSerializer(data=ingredient_data)
                ingredient_serializer.is_valid(raise_exception=True)
                ingredient_serializer.save()
                j += 1

            items.append(item_serializer.data)
            i += 1

        self._notify(
            f"Menu '{menu.name}' with {len(items)} items created for restaurant '{menu.restaurant.name}'."
        )

        return Response(FullMenuSerializer(menu).data, status=status.HTTP_201_CREATED)
