from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.restaurants.constants import OrderStatus, OrderType, PaymentStatus, TableState
from apps.restaurants.models import Orders
from apps.restaurants.services.table_lifecycle import release_table_after_payment


@receiver(post_save, sender=Orders)
def sync_dine_in_table_state(sender, instance, **kwargs):
    """
    Keep the physical table state synchronized with the authoritative order
    lifecycle. This covers every order mutation path, including legacy/admin
    and dashboard endpoints.
    """
    if instance.order_type != OrderType.DINE_IN.value or not instance.table_id:
        return

    table = instance.table
    if not table or not table.is_active:
        return

    if instance.order_status == OrderStatus.SERVED.value:
        if instance.payment_status == PaymentStatus.CONFIRMED.value:
            release_table_after_payment(instance)
            return
        desired_state = TableState.SERVED.value
    elif instance.order_status == OrderStatus.PREPARED.value:
        desired_state = TableState.READY.value
    elif instance.order_status == OrderStatus.PREPARING.value:
        desired_state = TableState.PREPARING.value
    elif instance.order_status == OrderStatus.TO_PREPARE.value:
        desired_state = TableState.ORDER_PLACED.value
    else:
        return

    if table.table_state != desired_state:
        table.table_state = desired_state
        table.save(update_fields=["table_state", "updated_at"])
