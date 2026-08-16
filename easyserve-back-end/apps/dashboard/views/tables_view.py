from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from apps.dashboard.services import TableService
from apps.dashboard.serializers import TableSerializer
from apps.restaurants.models import Table, Restaurant


class TablesListView(ListAPIView):
    serializer_class = TableSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, "profile", None)
        service = TableService()

        # Super admins can see tables from every active restaurant.
        if user.is_superuser or user.user_type == "super_admin":
            tables_data = []
            restaurant_ids = Restaurant.objects.filter(
                is_active=True
            ).values_list("id", flat=True)

            for restaurant_id in restaurant_ids:
                tables_data.extend(service.get_tables_data(restaurant_id))

            return tables_data

        allowed_user_types = {"waiter", "manager", "restaurant_owner"}

        if not profile or user.user_type not in allowed_user_types:
            return Table.objects.none()

        # Resolve the restaurant from the staff profile first.
        restaurant = getattr(profile, "restaurant", None)

        # Older/demo profiles may only have selected_restaurant populated.
        if restaurant is None and getattr(profile, "selected_restaurant", None):
            restaurant = Restaurant.objects.filter(
                pk=profile.selected_restaurant,
                is_active=True,
            ).first()

        # Waiters can also be resolved from an assigned active table.
        if restaurant is None and user.user_type == "waiter":
            assigned_table = (
                Table.objects.filter(
                    assigned_waiter=profile,
                    is_active=True,
                )
                .select_related("restaurant")
                .order_by("table_number")
                .first()
            )
            if assigned_table:
                restaurant = assigned_table.restaurant

        # Restaurant owners may have the restaurant through ownership.
        if restaurant is None and user.user_type == "restaurant_owner":
            restaurant = (
                profile.owned_restaurants.filter(is_active=True)
                .order_by("id")
                .first()
            )

        # Demo/single-restaurant fallback: managers often have a profile but
        # no restaurant relation yet. If there is exactly one active restaurant,
        # use it instead of returning an empty table list.
        if restaurant is None:
            active_restaurants = Restaurant.objects.filter(is_active=True)
            if active_restaurants.count() == 1:
                restaurant = active_restaurants.first()

        if restaurant is None:
            return Table.objects.none()

        return service.get_tables_data(restaurant.id)
