from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from apps.dashboard.services import TableService
from apps.dashboard.serializers import TableSerializer
from apps.restaurants.models import Table


class TablesListView(ListAPIView):
    serializer_class = TableSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        allowed_user_types = {'waiter', 'manager', 'restaurant_owner'}

        if (
            not profile
            or user.user_type not in allowed_user_types
            or not profile.restaurant
        ):
            return Table.objects.none()

        service = TableService()
        tables_data = service.get_tables_data(profile.restaurant.id)

        return tables_data
