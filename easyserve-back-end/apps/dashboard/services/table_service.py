from apps.dashboard.repositories import TableRepository


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

                table_info.update({
                    "status": order.table.get_table_state_display().upper().replace(" ", "_"),
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
