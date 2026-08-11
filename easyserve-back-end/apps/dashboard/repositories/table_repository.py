from apps.restaurants.models import Table, Orders, OrderItem


class TableRepository:

    @staticmethod
    def get_all_tables(restaurant_id):
        qs = Table.objects.filter(table_number__isnull=False, restaurant_id=restaurant_id)
        if qs.exists():
            return qs

        return Table.objects.none()

    @staticmethod
    def get_latest_order_for_table(table):
        return Orders.objects.filter(table=table).order_by("-created_at").first()

    @staticmethod
    def get_order_items(order):
        return OrderItem.objects.filter(order=order)
