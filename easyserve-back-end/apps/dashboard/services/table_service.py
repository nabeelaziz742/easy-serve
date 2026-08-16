from apps.dashboard.repositories import TableRepository
from apps.restaurants.constants import OrderStatus, PaymentStatus, TableState


class TableService:

    @staticmethod
    def get_tables_data(restaurant_id):
        tables_data = []

        tables = TableRepository.get_all_tables(restaurant_id)

        for table in tables:
            order = TableRepository.get_latest_order_for_table(table)
            status = table.get_table_state_display().upper().replace(" ", "_")

            table_info = {
                "id": table.id,
                "number": table.table_number,
                "status": status,
                "customers": table.customer_count,
                "orderItems": [],
                "orderTime": None,
                "orderId": None,
                "customer_name": None,
                "review": None,
            }

            if order:
                items = TableRepository.get_order_items(order)

                # The order/payment lifecycle is authoritative once an order
                # has been served. This prevents a stale table_state from
                # keeping a completed table visibly OCCUPIED.
                if order.order_status == OrderStatus.SERVED.value:
                    if order.payment_status == PaymentStatus.CONFIRMED.value:
                        status = TableState.EMPTY.name
                    else:
                        status = TableState.PAYMENT_PENDING.name
                else:
                    status = order.table.get_table_state_display().upper().replace(" ", "_")

                table_info["status"] = status

                # A fully paid/closed table is clean for the next customer;
                # don't display the previous order as if it were still active.
                if status == TableState.EMPTY.name:
                    table_info["customers"] = 0
                else:
                    table_info.update({
                        "customers": order.table.customer_count,
                        "orderItems": [
                            {
                                "item_name": i.menu_item.name,
                                "quantity": i.quantity,
                                "price": str(i.price),
                                "comments": i.comments or ""
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
                                "created_at": order.review.created_at
                            }
                            if hasattr(order, "review") and order.review else None
                        ),
                    })

            tables_data.append(table_info)

        return tables_data
