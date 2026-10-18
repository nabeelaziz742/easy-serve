from datetime import timedelta
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.restaurants.constants import DineInSessionStatus, TableState, PaymentStatus, OrderStatus
from apps.restaurants.models import DineInSession

# A table scanned and seated but with no order yet stays reserved for the
# guests only this long; after that a new scan can take the table.
STALE_SESSION_MAX_IDLE_MINUTES = 30

# A checkout the customer never sent on (no cash request, no card payment,
# never accepted) only holds the table while they could still be on the
# payment page. After that it is an abandoned cart, not a guest at the table.
UNSUBMITTED_ORDER_GRACE_MINUTES = 30

# States that mean guests are at the table. RESERVED, CLEANING and
# UNAVAILABLE are set by staff and are never reset automatically.
BUSY_TABLE_STATES = (
    TableState.OCCUPIED.value,
    TableState.ORDER_PLACED.value,
    TableState.PREPARING.value,
    TableState.READY.value,
    TableState.SERVED.value,
    TableState.PAYMENT_PENDING.value,
)


def submitted_order_q():
    """Orders the customer actually sent to the restaurant.

    An order reaches the waiter only once the customer picked a payment
    method: a cash request creates PaymentDetails, a card payment confirms
    the order. Accepted or already-cooking orders count too, so older data
    created before this rule keeps working.
    """
    return (
        Q(paymentdetails__isnull=False)
        | Q(payment_status=PaymentStatus.CONFIRMED.value)
        | Q(accepted_by_waiter=True)
        | ~Q(order_status=OrderStatus.TO_PREPARE.value)
    )


def open_orders(orders_qs):
    """Orders that still keep a table busy: not cancelled, not paid, and
    either sent to the restaurant or placed recently enough that the
    customer may still be choosing how to pay."""
    cutoff = timezone.now() - timedelta(minutes=UNSUBMITTED_ORDER_GRACE_MINUTES)
    return (
        orders_qs
        .filter(order_cancelled=False)
        .exclude(payment_status__in=[PaymentStatus.CONFIRMED.value, PaymentStatus.CANCELLED.value])
        .filter(submitted_order_q() | Q(created_at__gte=cutoff))
        .distinct()
    )


def _free_table(table):
    if table.table_state in BUSY_TABLE_STATES or table.customer_count:
        table.table_state = TableState.EMPTY.value
        table.customer_count = 0
        table.save(update_fields=["table_state", "customer_count", "updated_at"])


def set_table_awaiting_payment(order):
    """Move a served dine-in table out of OCCUPIED while payment is pending."""
    table = order.table
    if not table or order.order_type != 1:
        return

    table.table_state = TableState.PAYMENT_PENDING.value
    table.save(update_fields=["table_state", "updated_at"])


def release_table_after_payment(order):
    """Release a fully paid dine-in table and close its active session.

    A session can hold several orders. The table is only released once no
    other order of its active session still owes money; otherwise settling
    the first order freed the table while the guests had not paid the rest.
    """
    table = order.table
    if not table or order.order_type != 1:
        return

    from apps.restaurants.models import Orders

    # Re-saving an old paid order (a review, an admin edit) must not close
    # the session of the next guests who sat down at the same table.
    if order.dine_in_session_id and not DineInSession.objects.filter(
        id=order.dine_in_session_id,
        status=DineInSessionStatus.ACTIVE.value,
    ).exists():
        return

    still_unpaid = open_orders(
        Orders.objects
        .filter(
            table=table,
            dine_in_session__status=DineInSessionStatus.ACTIVE.value,
        )
        .exclude(id=order.id)
    )
    if still_unpaid.exists():
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

    1. A session whose orders are all paid, cancelled or abandoned before
       payment (see open_orders) is finished and gets closed.
    2. A session with no orders that was opened more than
       STALE_SESSION_MAX_IDLE_MINUTES ago is abandoned and gets closed.
    3. If no genuine session and no open order remain, a table still
       marked busy is reset to EMPTY. This is what frees tables that an
       earlier bug left stuck after settlement.

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

    now = timezone.now()
    genuine_session = None

    for session in qs:
        orders = session.orders.all()
        if orders.exists():
            if open_orders(orders).exists():
                genuine_session = session
            else:
                session.close()
        elif now - session.opened_at > timedelta(minutes=STALE_SESSION_MAX_IDLE_MINUTES):
            session.close()
        else:
            genuine_session = session

    if not genuine_session and not open_orders(table.orders.all()).exists():
        _free_table(table)

    return genuine_session


def table_is_busy(table):
    """Single source of truth for "is this table in use right now".

    Heals stale state on the way, so every screen that asks (waiter
    dashboard, Tables page, QR scan) gets the same answer.
    """
    if clean_and_get_active_session(table) is not None:
        return True
    return open_orders(table.orders.all()).exists()
