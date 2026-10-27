from apps.restaurants.models import Table, Orders, OrderItem


class TableRepository:

    @staticmethod
    def get_all_tables(restaurant_id):
        return (
            Table.objects.filter(table_number__isnull=False, restaurant_id=restaurant_id)
            .select_related("restaurant")
            .order_by("table_number")
        )

    @staticmethod
    def get_latest_order_for_table(table):
        return Orders.objects.filter(table=table).order_by("-created_at").first()

    @staticmethod
    def get_current_order_for_table(table, session=None):
        """Latest order of the guests now at the table, if any."""
        from apps.restaurants.services.table_lifecycle import open_orders

        if session is not None:
            order = session.orders.filter(order_cancelled=False).order_by("-created_at").first()
            if order:
                return order
        return open_orders(Orders.objects.filter(table=table)).order_by("-created_at").first()

    @staticmethod
    def get_order_items(order):
        return OrderItem.objects.filter(order=order)
