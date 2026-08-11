import csv
from django.core.management.base import BaseCommand
from apps.restaurants.models import Restaurant, MenuItem, MenuItemIngredient, Cart, CartItem
from apps.restaurants.models import Orders, OrderItem
from apps.restaurants.models import Review
from apps.core.models import User
import logging


logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Dump DB records into CSV files for ML training"

    def handle(self, *args, **kwargs):
        self.stdout.write("Dumping ML data...")

        self.dump_users()
        self.dump_restaurants()
        self.dump_menus()
        self.dump_menu_items()
        self.dump_orders()
        self.dump_order_items()
        self.dump_payments()
        self.dump_reviews()
        self.dump_tables()
        self.dump_reservations()
        self.dump_carts()
        self.dump_cart_items()

        self.stdout.write(self.style.SUCCESS("ML Data dump completed."))

    def dump_users(self):
        with open("dataset/users.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "email", "username", "user_type"])

            for u in User.objects.all():
                w.writerow([u.id, u.email, u.username, u.user_type])

    def dump_restaurants(self):
        with open("dataset/restaurants.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "name", "description"])

            for r in Restaurant.objects.all():
                w.writerow([r.id, r.name, r.description])

    def dump_menus(self):
        with open("dataset/menus.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "restaurant_id", "name"])
            from apps.restaurants.models import Menu

            for m in Menu.objects.all():
                w.writerow([m.id, m.restaurant_id, m.name])

    def dump_menu_items(self):
        # -------------------------------
        # MENU ITEMS CSV WITH INGREDIENTS
        # -------------------------------
        with open("dataset/menu_items.csv", "w", newline="") as f:
            w = csv.writer(f)

            # ✨ Added new column "ingredients"
            w.writerow(["id", "menu_id", "name", "price", "description", "ingredients"])

            for item in MenuItem.objects.all():
                # ✨ NEW: Get ingredients for this menu item
                ingredients = MenuItemIngredient.objects.filter(menu_item=item)

                # ✨ Convert ingredients to a comma-separated string
                ingredient_list = ", ".join([ing.name for ing in ingredients])

                # Write row including ingredients
                w.writerow([
                    item.id,
                    item.menu_id,
                    item.name,
                    item.price,
                    item.description,
                    ingredient_list  # ✨ Added ingredients here
                ])

        # -------------------------------------------
        # ORIGINAL INGREDIENTS CSV — NO CHANGES NEEDED
        # -------------------------------------------
        with open("dataset/ingredients.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "menu_item_id", "name", "description"])

            for ing in MenuItemIngredient.objects.all():
                w.writerow([ing.id, ing.menu_item_id, ing.name, ing.description])

    def dump_orders(self):
        with open("dataset/orders.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "user_id", "total_price", "created_at"])

            for o in Orders.objects.all():
                w.writerow([o.id, o.user_id, o.total_price, o.created_at])

    def dump_order_items(self):
        with open("dataset/order_items.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "order_id", "menu_item_id", "price", "quantity"])

            for oi in OrderItem.objects.all():
                w.writerow([oi.id, oi.order_id, oi.menu_item_id, oi.price, oi.quantity])

    def dump_payments(self):
        with open("dataset/payments.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "order_id", "amount", "method", "status", "paid_at"])

            from apps.payment.models import Payment

            for p in Payment.objects.all():
                w.writerow([
                    p.id,
                    p.order_id,
                    p.amount,
                    p.method,
                    p.status,
                    p.paid_at,
                ])

    def dump_reviews(self):
        with open("dataset/reviews.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "user_id", "order_id", "waiter_id", "restaurant_id", "rating", "comment"])

            for r in Review.objects.all():

                # ⭐ Resolve restaurant_id through order -> order_items -> menu_item -> menu -> restaurant
                try:
                    order_items = OrderItem.objects.filter(order_id=r.order_id)

                    if order_items.exists():
                        menu_item = order_items.first().menu_item
                        restaurant_id = menu_item.menu.restaurant_id
                    else:
                        restaurant_id = None

                except Exception as exc:
                    logger.warning(exc)
                    restaurant_id = None

                w.writerow([
                    r.id,
                    r.user_id,
                    r.order_id,
                    r.waiter_id,
                    restaurant_id,
                    r.rate,
                    r.comment
                ])

    def dump_tables(self):
        from apps.restaurants.models import Table

        with open("dataset/tables.csv", "w", newline="") as f:
            w = csv.writer(f, quoting=csv.QUOTE_ALL)  # FIXED

            w.writerow(["id", "restaurant_id", "name", "capacity"])

            for t in Table.objects.all():
                w.writerow([t.id, t.restaurant_id, t.table_name, t.capacity])

    def dump_reservations(self):
        from apps.restaurants.models import Reservation

        with open("dataset/reservations.csv", "w", newline="") as f:
            w = csv.writer(f, quoting=csv.QUOTE_ALL)

            w.writerow([
                "id",
                "user_id",
                "restaurant_id",
                "table_id",
                "reservation_time",
                "guest_count",
                "status"
            ])

            for r in Reservation.objects.all():
                w.writerow([
                    r.id,
                    r.user_id,
                    r.restaurant_id,
                    r.table_id,
                    r.reservation_time.isoformat(),
                    r.guest_count,
                    r.status
                ])


    def dump_carts(self):
        with open("dataset/carts.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "user_id", "created_at"])
            for c in Cart.objects.all():
                w.writerow([c.id, c.user_id, c.created_at])

    def dump_cart_items(self):
        with open("dataset/cart_items.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "cart_id", "menu_item_id", "quantity"])
            for ci in CartItem.objects.all():
                w.writerow([ci.id, ci.cart_id, ci.menu_item_id, ci.quantity])
