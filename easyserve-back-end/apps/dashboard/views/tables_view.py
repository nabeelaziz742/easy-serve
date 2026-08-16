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

        # Super admins are not tied to a single restaurant. The admin
        # dashboard must aggregate tables from every active restaurant.
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

        # Existing accounts can be connected to a restaurant in different
        # ways. Resolve them deterministically instead of silently returning [].
        restaurant = getattr(profile, "restaurant", None)

        if restaurant is None and getattr(profile, "selected_restaurant", None):
            restaurant = Restaurant.objects.filter(
                pk=profile.selected_restaurant,
                is_active=True,
            ).first()

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

        if restaurant is None and user.user_type == "restaurant_owner":
            restaurant = (
                profile.owned_restaurants.filter(is_active=True)
                .order_by("id")
                .first()
            )

        if restaurant is None:
            return Table.objects.none()

        return service.get_tables_data(restaurant.id)
