"""Which table a customer's QR scan points at.

A scan names a restaurant, a table number and the table's secret QR key.
The ids alone are guessable, so the key is what proves the guest is
physically at the table: without it nobody can open the menu in dine-in
mode, start a table session or join one that is already running.
"""
import secrets

from rest_framework.exceptions import NotFound, ParseError

from apps.restaurants.models import Restaurant, Table


def read_scan(data):
    """The (restaurant id, table number, key) a request's QR scan carries."""
    restaurant_id = data.get("restaurant")
    table_number = data.get("table")
    if not restaurant_id or not table_number:
        raise ParseError("restaurant and table are required")
    return restaurant_id, table_number, data.get("key") or ""


def get_scanned_table(restaurant_id, table_number, qr_key, queryset=None):
    """The active table the QR scan belongs to, or NotFound.

    The same error covers an unknown table and a wrong key, so a caller
    cannot probe which tables exist.
    """
    restaurant = Restaurant.objects.filter(id=_as_int(restaurant_id), is_active=True).first()
    if restaurant is None:
        raise NotFound("This restaurant is not currently available.")

    table = (
        (queryset if queryset is not None else Table.objects)
        .filter(restaurant=restaurant, table_number=_as_int(table_number), is_active=True)
        .select_related("restaurant")
        .first()
    )
    if table is None or not secrets.compare_digest(str(qr_key).encode(), table.qr_key.encode()):
        raise NotFound("This table QR code is not valid. Please scan the QR code on your table.")
    return table


def _as_int(value):
    """The number in a scanned id, or -1 (matches nothing) when it is not one."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return -1
