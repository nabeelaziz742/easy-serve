from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Q

from apps.restaurants.models import MenuItem
from apps.recipes.models import Recipe
from apps.recipes.serializers import (
    RecipeListSerializer,
    RecipeDetailSerializer,
    RecipeCreateUpdateSerializer,
)
from apps.recipes.permissions import HasRecipesAccess
from apps.recipes.services import RecipeService


class RecipeViewSet(ModelViewSet):
    permission_classes = [HasRecipesAccess]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RecipeDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return RecipeCreateUpdateSerializer
        return RecipeListSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        restaurant_id = None
        if hasattr(self, 'request') and self.request:
            restaurant_id = self.request.query_params.get('restaurant_id')
            if not restaurant_id and hasattr(self.request, 'data') and isinstance(self.request.data, dict):
                restaurant_id = self.request.data.get('restaurant_id')
        restaurant = RecipeService.resolve_user_restaurant(
            getattr(self.request, 'user', None),
            restaurant_id
        )
        ctx['restaurant'] = restaurant
        return ctx

    def _get_target_restaurant(self):
        restaurant_id = None
        if hasattr(self, 'request') and self.request:
            restaurant_id = self.request.query_params.get('restaurant_id')
            if not restaurant_id and hasattr(self.request, 'data') and isinstance(self.request.data, dict):
                restaurant_id = self.request.data.get('restaurant_id')
        restaurant = RecipeService.resolve_user_restaurant(self.request.user, restaurant_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")
        return restaurant

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Recipe.objects.none()

        explicit_id = self.request.query_params.get('restaurant_id')
        restaurant = RecipeService.resolve_user_restaurant(user, explicit_id)
        if not restaurant:
            return Recipe.objects.none()

        qs = (
            Recipe.objects
            .filter(restaurant=restaurant)
            .select_related('menu_item', 'menu_item__category')
            .prefetch_related('items', 'items__inventory_item', 'items__inventory_item__uom', 'items__uom')
            .order_by('menu_item__name')
        )

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is not None:
            if is_active_param.lower() in ['true', '1']:
                qs = qs.filter(is_active=True)
            elif is_active_param.lower() in ['false', '0']:
                qs = qs.filter(is_active=False)

        category_id = self.request.query_params.get('category_id')
        if category_id:
            qs = qs.filter(menu_item__category_id=category_id)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(menu_item__name__icontains=search) |
                Q(instructions__icontains=search) |
                Q(menu_item__category__name__icontains=search)
            )

        return qs

    def create(self, request, *args, **kwargs):
        restaurant = self._get_target_restaurant()
        user_profile = getattr(request.user, 'profile', None)

        serializer = self.get_serializer(data=request.data, context={'restaurant': restaurant, 'request': request})
        serializer.is_valid(raise_exception=True)

        validated_data = dict(serializer.validated_data)
        items_data = validated_data.pop('items')
        menu_item = validated_data.pop('menu_item_id')
        validated_data['menu_item'] = menu_item

        recipe = RecipeService.create_recipe(
            restaurant=restaurant,
            user_profile=user_profile,
            validated_data=validated_data,
            items_data=items_data
        )

        detail_serializer = RecipeDetailSerializer(recipe, context={'restaurant': restaurant, 'request': request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        restaurant = self._get_target_restaurant()
        user_profile = getattr(request.user, 'profile', None)

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=kwargs.get('partial', False),
            context={'restaurant': restaurant, 'request': request}
        )
        serializer.is_valid(raise_exception=True)

        validated_data = dict(serializer.validated_data)
        items_data = validated_data.pop('items', None)

        recipe = RecipeService.update_recipe(
            recipe=instance,
            user_profile=user_profile,
            validated_data=validated_data,
            items_data=items_data
        )

        detail_serializer = RecipeDetailSerializer(recipe, context={'restaurant': restaurant, 'request': request})
        return Response(detail_serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='available-menu-items')
    def available_menu_items(self, request):
        restaurant = self._get_target_restaurant()
        # Find active menu items for this restaurant
        all_items = (
            MenuItem.objects
            .filter(menu__restaurant=restaurant, is_available=True)
            .select_related('category', 'menu')
            .order_by('name')
        )
        existing_recipe_item_ids = Recipe.objects.filter(restaurant=restaurant).values_list('menu_item_id', flat=True)
        available = all_items.exclude(id__in=existing_recipe_item_ids)

        data = []
        for itm in available:
            data.append({
                'id': itm.id,
                'name': itm.name,
                'price': str(itm.price),
                'category_name': itm.category.name if itm.category else 'Uncategorized',
                'description': itm.description or '',
            })
        return Response(data)
