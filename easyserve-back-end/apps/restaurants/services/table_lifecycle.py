from django.db import transaction

from apps.restaurants.constants import DineInSessionStatus, TableState
from apps.restaurants.models import DineInSession


def set_table_awaiting_payment(order):
    """Move a served dine-in table out of OCCUPIED while payment is pending."""
    table = order.table
    if not table or order.order_type != 1:
        return

    table.table_state = TableState.PAYMENT_PENDING.value
    table.save(update_fields=["table_state", "updated_at"])


def release_table_after_payment(order):
    """Release a fully paid dine-in table and close its active session."""
    table = order.table
    if not table or order.order_type != 1:
        return

    with transaction.atomic():
        session = (
            DineInSession.objects.select_for_update()
            .filter(
                table=table,
                status=DineInSessionStatus.ACTIVE.value,
            )
            .first()
        )

        if session:
            session.close()

        table.table_state = TableState.EMPTY.value
        table.customer_count = 0
        table.save(update_fields=["table_state", "customer_count", "updated_at"])
