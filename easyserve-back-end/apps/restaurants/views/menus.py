from rest_framework.generics import RetrieveAPIView, ListAPIView
from utils.paginations import LimitOffsetOf10Pagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.restaurants.models import Restaurant
from apps.restaurants.serializers import MenuSerializer, RestaurantSerializerForMenu, MenuItemDetailSerializer


class MenuListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = MenuSerializer
    pagination_class = LimitOffsetOf10Pagination

    def get_queryset(self):
        restaurant_id = self.kwargs.get('restaurant_id')
        return MenuSerializer.Meta.model.objects.filter(restaurant_id=restaurant_id)

    def list(self, request, *args, **kwargs):
        restaurant_id = self.kwargs.get('restaurant_id')

        try:
            restaurant = Restaurant.objects.get(id=restaurant_id)
        except Restaurant.DoesNotExist:
            return Response({"detail": "Restaurant not found."}, status=404)

        queryset = self.get_queryset()
        menu_serializer = self.get_serializer(queryset, many=True)

        restaurant_serializer = RestaurantSerializerForMenu(restaurant)

        return Response({
            "restaurant": restaurant_serializer.data,
            "menus": menu_serializer.data
        })

class MenuDetailView(RetrieveAPIView):
    """
    View to retrieve a single menu by its ID.
    """
    permission_classes = [AllowAny]
    serializer_class = MenuSerializer
    queryset = MenuSerializer.Meta.model.objects.all()
    lookup_field = 'id'

class MenuItemListView(ListAPIView):
    """
    View to list all menu items for a specific menu.
    """
    permission_classes = [AllowAny]
    serializer_class = MenuSerializer

    def get_queryset(self):
        """
        Returns the queryset of menu items filtered by the menu ID provided in the URL.
        """
        menu_id = self.kwargs.get('menu_id')
        return MenuSerializer.Meta.model.objects.filter(id=menu_id).prefetch_related('menu_items')

class MenuItemDetailView(RetrieveAPIView):
    """
    View to retrieve a single menu item by its ID.
    """
    permission_classes = [AllowAny]
    serializer_class = MenuItemDetailSerializer
    queryset = MenuItemDetailSerializer.Meta.model.objects.all()
    lookup_field = 'id'
