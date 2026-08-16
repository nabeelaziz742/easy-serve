from django.utils.timezone import now
from apps.restaurants.models import Orders, Table
from apps.restaurants.constants import OrderStatus, TableState, PaymentStatus


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
    def get_active_table_count(user_profile):
        """Return distinct tables currently requiring waiter attention.

        A table stays active while its dine-in order is in the service
        pipeline, including the post-service cash-settlement stage. A table
        becomes inactive only when the served order is fully paid/confirmed.
        We also include explicitly assigned non-empty tables so the metric
        remains useful before the first order is created.
        """
        inactive_states = {
            TableState.EMPTY.value,
            TableState.CLEANING.value,
            TableState.UNAVAILABLE.value,
        }

        assigned_active_ids = set(
            WaiterRepository.get_assigned_tables(user_profile)
            .exclude(table_state__in=inactive_states)
            .values_list("id", flat=True)
        )

        active_order_ids = set(
            Orders.objects.filter(
                waiter=user_profile,
                table__isnull=False,
                order_cancelled=False,
            )
            .exclude(
                order_status=OrderStatus.SERVED.value,
                payment_status=PaymentStatus.CONFIRMED.value,
            )
            .values_list("table_id", flat=True)
            .distinct()
        )

        return len(assigned_active_ids | active_order_ids)

    @staticmethod
    def get_today_stats(user_profile):
        today_orders = WaiterRepository.get_today_orders(user_profile)

        return {
            "total_orders": today_orders.count() or 0,
            "served_orders": today_orders.filter(order_status=OrderStatus.SERVED).count() or 0,
            "ready_orders": today_orders.filter(order_status=OrderStatus.PREPARED).count() or 0,
            "active_tables": WaiterRepository.get_active_table_count(user_profile),
            "avg_serve_time": user_profile.avg_serve_time or "0",
        }
