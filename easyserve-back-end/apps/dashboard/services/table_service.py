from apps.dashboard.repositories import TableRepository
from apps.restaurants.constants import TableState
from apps.restaurants.services.table_lifecycle import clean_and_get_active_session


class TableService:

    @staticmethod
    def get_tables_data(restaurant_id):
        tables_data = []

        tables = TableRepository.get_all_tables(restaurant_id)

        for table in tables:
            # The shared lifecycle decides whether the table is in use and
            # heals a table left busy after its bill was settled. The page
            # used to guess from the latest order instead, so it could show
            # EMPTY while the waiter dashboard still counted the table.
            session = clean_and_get_active_session(table)
            table.refresh_from_db(fields=["table_state", "customer_count"])
            order = TableRepository.get_current_order_for_table(table, session)

            # Enum names match the keys the Tables page styles (READY,
            # PREPARING, PAYMENT_PENDING); the display labels did not.
            status = TableState(table.table_state).name

            table_info = {
                "id": table.id,
                "number": table.table_number,
                "status": status,
                "customers": table.customer_count if status != TableState.EMPTY.name else 0,
                "orderItems": [],
                "orderTime": None,
                "orderId": None,
                "customer_name": None,
                "review": None,
            }

            if order and status != TableState.EMPTY.name:
                items = TableRepository.get_order_items(order)
                table_info.update({
                    "orderItems": [
                        {
                            "item_name": i.menu_item.name,
                            "quantity": i.quantity,
                            "price": str(i.price),
                            "comments": i.comments or "",
                        }
                        for i in items
                    ],
                    "orderTime": order.created_at,
                    "orderId": order.id,
                    "customer_name": getattr(order.user, "full_name", None),
                    "review": (
                        {
                            "rate": order.review.rate,
                            "comment": order.review.comment,
                            "created_by": order.review.created_by,
                            "created_at": order.review.created_at,
                        }
                        if hasattr(order, "review") and order.review
                        else None
                    ),
                })

            tables_data.append(table_info)

        return tables_data
