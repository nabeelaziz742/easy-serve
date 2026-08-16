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
        allowed_user_types = {"waiter", "manager", "restaurant_owner"}

        if not profile or user.user_type not in allowed_user_types:
            return Table.objects.none()

        # Prefer the explicit restaurant relation. Some existing staff
        # accounts only have selected_restaurant populated, while waiter
        # accounts may only be connected through assigned tables. Resolve
        # those legacy/demo accounts instead of silently returning [] on the
        # dashboard.
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
            # Keep the API stable for incomplete staff profiles. The frontend
            # receives an empty paginated result instead of a server error.
            return Table.objects.none()

        service = TableService()
        tables_data = service.get_tables_data(restaurant.id)

        return tables_data
