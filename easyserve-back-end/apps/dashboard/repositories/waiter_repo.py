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
        """Count distinct tables currently requiring waiter attention.

        The latest order is authoritative when a stale TableState conflicts
        with the order lifecycle. A served + confirmed order releases the
        table from the active count; a served order awaiting cash settlement
        remains active until the manager settles it.
        """
        inactive_states = {
            TableState.EMPTY.value,
            TableState.CLEANING.value,
            TableState.UNAVAILABLE.value,
        }
        active_ids = set()

        for table in WaiterRepository.get_assigned_tables(user_profile):
            latest_order = (
                Orders.objects
                .filter(table=table, order_cancelled=False)
                .order_by("-created_at")
                .first()
            )

            if latest_order and (
                latest_order.order_status == OrderStatus.SERVED.value
                and latest_order.payment_status == PaymentStatus.CONFIRMED.value
            ):
                continue

            if table.table_state not in inactive_states:
                active_ids.add(table.id)

        active_order_table_ids = Orders.objects.filter(
            waiter=user_profile,
            table__isnull=False,
            order_cancelled=False,
        ).exclude(
            order_status=OrderStatus.SERVED.value,
            payment_status=PaymentStatus.CONFIRMED.value,
        ).values_list("table_id", flat=True).distinct()

        active_ids.update(active_order_table_ids)
        return len(active_ids)

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
