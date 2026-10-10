from datetime import timedelta
from django.db import transaction
from django.utils import timezone

from apps.restaurants.constants import DineInSessionStatus, TableState, PaymentStatus
from apps.restaurants.models import DineInSession

STALE_SESSION_MAX_IDLE_HOURS = 2


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
        sessions = (
            DineInSession.objects.select_for_update()
            .filter(
                table=table,
                status=DineInSessionStatus.ACTIVE.value,
            )
        )
        for session in sessions:
            session.close()

        table.table_state = TableState.EMPTY.value
        table.customer_count = 0
        table.save(update_fields=["table_state", "customer_count", "updated_at"])


def clean_and_get_active_session(table, restaurant=None, lock=False):
    """
    Evaluates and cleans up any active DineInSession for a table.
    
    1. If an active session's orders are all paid (PaymentStatus.CONFIRMED) or cancelled,
       the session is completed and closed.
    2. If an active session has no orders and was opened more than STALE_SESSION_MAX_IDLE_HOURS
       ago, it is abandoned/stale and closed.
    3. If no genuine active session or active orders remain, the table's state is reset to EMPTY.
    
    Returns the genuine active DineInSession if one exists and is currently in progress,
    or None if the table is free.
    """
    qs = DineInSession.objects.filter(
        table=table,
        status=DineInSessionStatus.ACTIVE.value,
    )
    if restaurant:
        qs = qs.filter(restaurant=restaurant)

    if lock:
        qs = qs.select_for_update()

    active_sessions = list(qs)
    if not active_sessions:
        active_unpaid_orders = table.orders.exclude(
            payment_status__in=[PaymentStatus.CONFIRMED.value, PaymentStatus.CANCELLED.value]
        )
        if not active_unpaid_orders.exists() and table.table_state in [
            TableState.OCCUPIED.value,
            TableState.PAYMENT_PENDING.value,
            TableState.SERVED.value,
        ]:
            table.table_state = TableState.EMPTY.value
            table.customer_count = 0
            table.save(update_fields=["table_state", "customer_count", "updated_at"])
        return None

    now = timezone.now()
    genuine_session = None

    for session in active_sessions:
        orders = session.orders.all()
        if orders.exists():
            active_orders = orders.exclude(
                payment_status__in=[PaymentStatus.CONFIRMED.value, PaymentStatus.CANCELLED.value]
            )
            if active_orders.exists():
                genuine_session = session
            else:
                session.close()
        else:
            if now - session.opened_at > timedelta(hours=STALE_SESSION_MAX_IDLE_HOURS):
                session.close()
            else:
                genuine_session = session

    if not genuine_session:
        active_unpaid_orders = table.orders.exclude(
            payment_status__in=[PaymentStatus.CONFIRMED.value, PaymentStatus.CANCELLED.value]
        )
        if not active_unpaid_orders.exists() and table.table_state in [
            TableState.OCCUPIED.value,
            TableState.PAYMENT_PENDING.value,
            TableState.SERVED.value,
        ]:
            table.table_state = TableState.EMPTY.value
            table.customer_count = 0
            table.save(update_fields=["table_state", "customer_count", "updated_at"])

    return genuine_session

