from django.db import transaction

from apps.dashboard.repositories import OrdersRepository
from apps.restaurants.constants import OrderStatus, PaymentStatus
from apps.restaurants.services.table_lifecycle import (
    set_table_awaiting_payment,
    release_table_after_payment,
)


class OrderService:
    @staticmethod
    @transaction.atomic
    def change_status(order, status_input):
        if isinstance(status_input, int):
            try:
                value = OrderStatus(status_input)
            except ValueError:
                raise ValueError(f"Invalid status '{status_input}'")
        else:
            val_str = str(status_input).strip()
            if val_str.isdigit():
                try:
                    value = OrderStatus(int(val_str))
                except ValueError:
                    raise ValueError(f"Invalid status '{status_input}'")
            else:
                matched = None
                for c_val, c_label in OrderStatus.choices:
                    if val_str.lower() == c_label.lower():
                        matched = OrderStatus(c_val)
                        break
                if not matched:
                    for member in OrderStatus:
                        if val_str.lower() == member.name.lower():
                            matched = member
                            break
                if not matched:
                    raise ValueError(f"Invalid status '{status_input}'")
                value = matched

        updated_order = OrdersRepository.update_status(order, value)

        # Automatic BOM / Recipe Stock Consumption upon PREPARED
        if value == OrderStatus.PREPARED:
            from apps.recipes.services.consumption_service import RecipeConsumptionService
            RecipeConsumptionService.consume_order_inventory(updated_order)

        # A served dine-in order is no longer an occupied table. Keep it
        # visible as awaiting payment until the payment is actually settled.
        if value == OrderStatus.SERVED:
            if updated_order.payment_status == PaymentStatus.CONFIRMED.value:
                release_table_after_payment(updated_order)
            else:
                set_table_awaiting_payment(updated_order)

        return updated_order

