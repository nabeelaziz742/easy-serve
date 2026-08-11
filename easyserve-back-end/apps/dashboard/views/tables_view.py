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
        if not profile or not user.user_type == 'waiter' or not profile.restaurant:
            return Table.objects.none()

        service = TableService()
        tables_data = service.get_tables_data(profile.restaurant.id)

        return tables_data
