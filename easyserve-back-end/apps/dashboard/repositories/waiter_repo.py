from django.utils.timezone import now
from apps.restaurants.models import Orders, Table
from apps.restaurants.constants import OrderStatus, TableState


class WaiterRepository:

    @staticmethod
    def get_waiter_profile(user):
        return user.profile

    @staticmethod
    def get_today_orders(user_profile):
        today = now().date()
        return Orders.objects.filter(waiter=user_profile, created_at__date=today)

    @staticmethod
    def get_assigned_tables(user_profile):
        return Table.objects.filter(assigned_waiter=user_profile)

    @staticmethod
    def get_today_stats(user_profile):
        today_orders = WaiterRepository.get_today_orders(user_profile)
        assigned_tables = WaiterRepository.get_assigned_tables(user_profile)
        inactive_states = {
            TableState.EMPTY.value,
            TableState.CLEANING.value,
            TableState.UNAVAILABLE.value,
        }

        return {
            "total_orders": today_orders.count() or 0,
            "served_orders": today_orders.filter(order_status=OrderStatus.SERVED).count() or 0,
            "ready_orders": today_orders.filter(order_status=OrderStatus.PREPARED).count() or 0,
            "active_tables": assigned_tables.exclude(table_state__in=inactive_states).count() or 0,
            "avg_serve_time": user_profile.avg_serve_time or "0",
        }
