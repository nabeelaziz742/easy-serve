from apps.dashboard.repositories import WaiterRepository
from apps.dashboard.serializers import (
    WaiterUserSerializer,
    WaiterTableSerializer,
)


class WaiterDashboardService:

    @staticmethod
    def get_waiter_dashboard(user, request):

        profile = WaiterRepository.get_waiter_profile(user)
        stats = WaiterRepository.get_today_stats(profile)
        tables_qs = WaiterRepository.get_assigned_tables(profile)

        user_data = WaiterUserSerializer(profile, context={"request": request}).data
        tables_data = WaiterTableSerializer(tables_qs, many=True).data

        return {
            "user": user_data,
            "stats": stats,
            "tables": tables_data,
        }
