import os
import sys
import random
from decimal import Decimal
from datetime import datetime, timezone
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Setup Django
base_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(base_dir))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "coresite.settings")
import django
django.setup()

from django.db import transaction
from apps.restaurants.models import MenuItem, Orders, OrderItem
from apps.userprofile.models import UserProfile


def process_menu_item(menu_item, user, min_orders, max_orders, created_at):
    """Process seeding orders for a single menu item."""
    orders_buffer = []
    order_items_buffer = []

    num_orders = random.randint(min_orders, max_orders)
    for _ in range(num_orders):
        quantity = random.randint(1, 5)
        price = menu_item.price * quantity

        oi = OrderItem(
            menu_item=menu_item,
            quantity=quantity,
            price=price,
            created_at=created_at,
            updated_at=created_at,
        )
        order_items_buffer.append(oi)

    with transaction.atomic():
        # bulk create order items
        OrderItem.objects.bulk_create(order_items_buffer, batch_size=1000)
        order_items = OrderItem.objects.filter(menu_item=menu_item).order_by("-id")[:num_orders]

        new_orders = []
        for oi in order_items:
            o = Orders(
                user=user,
                ordered_date=created_at,
                total_price=oi.price,
                billing_first_name="Test",
                billing_last_name="User",
                billing_email="test@example.com",
                billing_phone="+1234567890",
                phone="+1234567890",
                ordered=True,
                payment_status="Confirmed",
                billing_address="123 Test St",
                shipping_address="123 Test St",
                created_at=created_at,
                updated_at=created_at,
            )
            new_orders.append(o)

        Orders.objects.bulk_create(new_orders, batch_size=1000)

        # add M2M relationship
        fresh_orders = Orders.objects.order_by("-id")[:num_orders]
        for idx, order in enumerate(fresh_orders):
            order.items.add(order_items[idx])

    return f"✅ Created {num_orders} orders for {menu_item.name}"


def seed_orders(limit=10, min_orders=50, max_orders=200, workers=5):
    """
    Seeds random orders for menu items concurrently.

    Args:
        limit (int): Number of menu items to process in this run.
        min_orders (int): Minimum orders per menu item.
        max_orders (int): Maximum orders per menu item.
        workers (int): Number of threads to use.
    """
    user = UserProfile.objects.first()
    if not user:
        raise SystemExit("❌ No user found. Create at least one UserProfile before seeding orders.")

    created_at = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

    menu_items = MenuItem.objects.exclude(menu_item_order_items__isnull=False)[:limit]
    print(f"Found {menu_items.count()} menu items without orders (processing {limit})")

    if not menu_items:
        print("✅ All menu items already have orders. Nothing to seed.")
        return

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [
            executor.submit(process_menu_item, mi, user, min_orders, max_orders, created_at)
            for mi in menu_items
        ]
        for future in as_completed(futures):
            print(future.result())


if __name__ == "__main__":
    # Example: process 5 menu items concurrently, each gets between 100-150 orders
    seed_orders(limit=800, min_orders=100, max_orders=150, workers=10)


    ranks = ["2", "3", "6", "5", "4", "7", "8", "9", "10", "J", "Q", "K", "A"]
