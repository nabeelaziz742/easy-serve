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
    def change_status(order, label):
        try:
            value = OrderStatus(label)
        except ValueError:
            raise ValueError(f"Invalid status '{label}'")

        updated_order = OrdersRepository.update_status(order, value)

        # A served dine-in order is no longer an occupied table. Keep it
        # visible as awaiting payment until the payment is actually settled.
        if value == OrderStatus.SERVED:
            if updated_order.payment_status == PaymentStatus.CONFIRMED.value:
                release_table_after_payment(updated_order)
            else:
                set_table_awaiting_payment(updated_order)

        return updated_order
