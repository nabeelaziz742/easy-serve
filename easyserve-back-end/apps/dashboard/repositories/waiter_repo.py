from django.utils.timezone import now
from apps.restaurants.models import Orders, Table
from apps.restaurants.constants import OrderStatus, PaymentStatus
from apps.restaurants.services.table_lifecycle import table_is_busy


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
        """Count tables this waiter is looking after that are in use now.

        Candidates are the waiter's assigned tables plus any table where the
        waiter still has an unpaid order. Whether a table is in use comes
        from the shared table lifecycle (active dine-in session or open
        order), the same rule that frees the table on settlement. The old
        count mixed raw table_state with "latest order" checks, so a table
        could stay "active" here after the manager had settled it.
        """
        candidate_ids = set(
            WaiterRepository.get_assigned_tables(user_profile).values_list("id", flat=True)
        )
        candidate_ids.update(
            Orders.objects.filter(
                waiter=user_profile,
                table__isnull=False,
                order_cancelled=False,
                payment_status=PaymentStatus.PENDING.value,
            ).values_list("table_id", flat=True)
        )

        return sum(
            1
            for table in Table.objects.filter(id__in=candidate_ids, is_active=True)
            if table_is_busy(table)
        )

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
