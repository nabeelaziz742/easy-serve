from django.utils.timezone import now
from apps.restaurants.models import Orders, Table


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

        return {
            "total_orders": today_orders.count() or 0,
            "served_orders": today_orders.filter(order_status="served").count() or 0,
            "ready_orders": today_orders.filter(order_status="ready").count() or 0,
            "avg_serve_time": user_profile.avg_serve_time or "0",
        }
