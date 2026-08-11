from decimal import Decimal
from django.db import transaction
from faker import Faker

# Import your project models - adjust if your app names differ
from apps.core.models import User
from apps.restaurants.models import (
    MenuItem,
    Cart, CartItem, Orders, OrderItem, Review,
)
from apps.payment.models import Payment
import logging
import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from apps.restaurants.models import Restaurant, Table
from apps.userprofile.models import UserProfile
from django.utils import timezone



logger = logging.getLogger(__name__)

fake = Faker()

ORDER_COMMENTS = [
    "No onions please", "Extra spicy", "Less oil", "Add extra cheese",
    "Pack separately", "No mayo", "Well cooked", "Add cutlery"
]

REVIEW_COMMENTS = [
    "Excellent taste!", "Good but could be better.",
    "Loved the food.", "Not satisfied with quality.",
    "Perfectly cooked and seasoned.", "Very slow service.",
    "Value for money", "Super delicious!"
]

RESERVATION_STATUSES = ["pending", "confirmed", "completed", "cancelled"]

PAYMENT_METHODS = ["cash", "card", "online"]  # NEW ARRAY
PAYMENT_STATUSES = ["success", "failed", "pending"]  # NEW ARRAY

ORDER_TYPES = ["DINE_IN", "TAKEAWAY", "DELIVERY"]  # NEW ARRAY
ORDER_STATUSES = ["TO_PREPARE", "PREPARING", "PREPARED", "SERVED"]  # NEW ARRAY


RESERVATION_COUNT = 200   # how many reservations to generate

def _price_from_menu(menu_item):
    """Convert menu_item.price safely."""
    try:
        return Decimal(menu_item.price)
    except Exception as exc:
        logger.warning(exc)
        return Decimal(str(random.uniform(5, 25))).quantize(Decimal("0.01"))


def _random_price_from_menu_item(menu_item):
    # menu_item.price is DecimalField
    try:
        return Decimal(menu_item.price)
    except Exception as exc:
        logger.warning(exc)
        # fallback
        return Decimal(str(random.uniform(5.0, 25.0))).quantize(Decimal("0.01"))


class Command(BaseCommand):
    help = "Seed the DB with users, carts, orders, reviews, tables using existing restaurants/menus/items."

    def add_arguments(self, parser):
        parser.add_argument('--users', type=int, default=100, help='Number of users to create')
        parser.add_argument('--orders', type=int, default=300, help='Number of orders to create')
        parser.add_argument('--carts', type=int, default=100, help='Number of carts to create')
        parser.add_argument('--reviews', type=int, default=200, help='Number of reviews to create')
        parser.add_argument('--tables-per-restaurant', type=int, default=10, help='Tables to create per restaurant')
        parser.add_argument('--overwrite', action='store_true', help='If set, will delete auto-created users (with seed tag) before creating')

    @transaction.atomic
    def handle(self, *args, **options):
        users_count = options['users']
        orders_count = options['orders']
        carts_count = options['carts']
        reviews_count = options['reviews']
        tables_per_rest = options['tables_per_restaurant']
        overwrite = options['overwrite']


        self.stdout.write(self.style.MIGRATE_HEADING("Starting DB seeding..."))
        created_users = []

        # Optional: delete previously created seeded users (safe-guarded by email pattern)
        if overwrite:
            self.stdout.write("Overwrite enabled: deleting previously seeded users (email contains 'seeded.user').")
            User.objects.filter(email__contains='seeded.user').delete()

        # Fetch existing resources to use as anchors
        restaurants = list(Restaurant.objects.all())
        if not restaurants:
            self.stdout.write(self.style.ERROR("No restaurants found. Create restaurants first."))
            return

        menu_items = list(MenuItem.objects.select_related('menu').all())
        if not menu_items:
            self.stdout.write(self.style.ERROR("No menu items found. Create menus and menu items first."))
            return

        # 1) Create Users + UserProfiles
        self.stdout.write(f"Creating {users_count} users and profiles...")
        for i in range(users_count):
            email = f"seeded.user.{i+1}@example.com"
            username = f"seeded_user_{i+1}"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'is_active': True,
                }
            )
            if created:
                # Set a default password
                user.set_password("password123")
                user.save()

            # Create or get profile
            profile, pcreated = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'first_name': fake.first_name(),
                    'last_name': fake.last_name(),
                    'phone': fake.phone_number(),
                    'bio': fake.sentence(nb_words=8),
                    'selected_restaurant': random.choice(restaurants).id,
                }
            )

            # set additional fields if newly created
            if pcreated:
                profile.save()

            created_users.append(user)

        self.stdout.write(self.style.SUCCESS(f"{len(created_users)} users ensured."))

        # 2) Create Tables for each restaurant if not exists
        self.stdout.write("Ensuring tables for restaurants...")
        for rest in restaurants:
            # count existing tables
            existing = rest.tables.count()  # related_name='tables'
            to_create = max(0, tables_per_rest - existing)
            for n in range(existing + 1, existing + to_create + 1):
                Table.objects.get_or_create(
                    restaurant=rest,
                    table_number=n,
                    defaults={'customer_count': 0}
                )
        self.stdout.write(self.style.SUCCESS("Tables ensured."))

        # 3) Create Reservations
        self.stdout.write("Creating reservations...")

        from apps.restaurants.models import Reservation  # ADD THIS AT TOP

        reservations_created = 0
        for i in range(200):  # or make it configurable
            user = random.choice(created_users)
            profile = user.profile

            # Pick restaurant (prefer selected_restaurant)
            try:
                rest = Restaurant.objects.get(id=profile.selected_restaurant)
            except Exception as exc:
                logger.warning(exc)
                rest = random.choice(restaurants)

            # Pick any table
            table = rest.tables.order_by('?').first()

            # Generate random reservation time (next 1–30 days)
            reservation_time = timezone.make_aware(
                fake.date_time_between(start_date="+1d", end_date="+30d")
            )

            reservation = Reservation.objects.create(
                user=profile,
                restaurant=rest,
                table=table,
                reservation_time=reservation_time,
                guest_count=random.randint(1, 8),
                status=random.choice(["pending", "confirmed", "completed", "cancelled"])
            )

            reservations_created += 1

        self.stdout.write(self.style.SUCCESS(f"{reservations_created} reservations created."))

        # 4) Create Carts and CartItems
        self.stdout.write(f"Creating up to {carts_count} carts with items...")
        carts_created = 0
        for i in range(min(carts_count, len(created_users))):
            user = created_users[i]
            profile = user.profile
            cart, cart_created = Cart.objects.get_or_create(user=profile)
            # clear existing items if overwrite flag set
            if overwrite:
                cart.cart_items.all().delete()
            # Add 1-5 random menu items
            items_to_add = random.randint(1, 5)
            chosen_items = random.sample(menu_items, min(items_to_add, len(menu_items)))
            total_cart = Decimal("0.00")
            for mi in chosen_items:
                qty = random.randint(1, 3)
                price = _random_price_from_menu_item(mi)
                cart_item, _ = CartItem.objects.get_or_create(
                    cart=cart,
                    menu_item=mi,
                    defaults={'quantity': qty, 'price': price}
                )
                # if existed, update quantity/price
                cart_item.quantity = qty
                cart_item.price = price
                cart_item.save()
                total_cart += (price * qty)
            cart.total_price = total_cart
            cart.save()
            carts_created += 1
        self.stdout.write(self.style.SUCCESS(f"{carts_created} carts created/updated."))

        # 5) Create Orders and OrderItems
        self.stdout.write(f"Creating {orders_count} orders...")
        orders_created = 0
        for i in range(orders_count):
            # pick a random user profile
            user = random.choice(created_users)
            profile = user.profile
            # Optionally create an order from a cart 50% of the time (if cart exists)
            use_cart = random.random() < 0.5
            if use_cart:
                try:
                    cart = Cart.objects.filter(user=profile).first()
                except Exception as exc:
                    logger.warning(exc)
                    cart = None
            else:
                cart = None

            order_defaults = {
                'user': profile,
                'order_type': random.choice(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
                'ordered_date': timezone.now(),
                'order_cancelled': False,
                'total_price': Decimal("0.00"),
            }

            order = Orders.objects.create(**order_defaults)

            if order.order_type == "DINE_IN":
                waiter = User.objects.filter(user_type="waiter").order_by("?").first().profile
                if waiter:
                    order.waiter = waiter
                    order.save()

            total_order_price = order.total_price

            payment = Payment.objects.create(
                order=order,
                amount=order.total_price,
                method=random.choice(["cash", "card", "online"]),
                status=random.choice(["success", "failed", "pending"]),
            )

            # after items added:
            payment.amount = total_order_price
            payment.save()

            # If using table assign random table for that restaurant
            try:
                # select restaurant that matches user's selected_restaurant if exists
                selected_rest_id = getattr(profile, 'selected_restaurant', None)
                if selected_rest_id:
                    rest = Restaurant.objects.filter(id=selected_rest_id).first()
                else:
                    rest = random.choice(restaurants)
            except Exception as exc:
                logger.warning(exc)
                rest = random.choice(restaurants)

            table = rest.tables.order_by('?').first()
            if table:
                order.table = table
                order.save()

            order_items_added = []
            total_order_price = Decimal("0.00")
            if cart and cart.cart_items.exists():
                for ci in cart.cart_items.all():
                    oi = OrderItem.objects.create(
                        order=order,
                        menu_item=ci.menu_item,
                        quantity=ci.quantity,
                        price=ci.price,
                        comments=ci.comments or ""
                    )
                    total_order_price += (oi.price * oi.quantity)
                    order_items_added.append(oi)
                # optional: empty cart after order
                # cart.cart_items.all().delete()
            else:
                # Create 1-5 random order items
                chosen = random.sample(menu_items, k=min(len(menu_items), random.randint(1, 5)))
                for mi in chosen:
                    qty = random.randint(1, 3)
                    price = _random_price_from_menu_item(mi)
                    oi = OrderItem.objects.create(
                        order=order,
                        menu_item=mi,
                        quantity=qty,
                        price=price,
                        comments=""
                    )
                    total_order_price += (price * qty)
                    order_items_added.append(oi)

            order.total_price = total_order_price
            order.ordered = True
            order.save()
            orders_created += 1

        self.stdout.write(self.style.SUCCESS(f"{orders_created} orders created."))

        # 6) Create Reviews for some orders
        self.stdout.write(f"Creating up to {reviews_count} reviews...")
        all_orders = list(Orders.objects.filter(ordered=True).exclude(review__isnull=False))
        reviews_created = 0
        random.shuffle(all_orders)
        for o in all_orders[:reviews_count]:
            # Create a review only if not exists
            try:
                if hasattr(o, "review") and o.review:
                    continue
            except Review.DoesNotExist:
                pass
            rating = random.randint(1, 5)
            Review.objects.create(
                order=o,
                user=o.user,
                created_by="customer",
                rate=rating,
                comment=fake.sentence(nb_words=10)
            )
            reviews_created += 1

        self.stdout.write(self.style.SUCCESS(f"{reviews_created} reviews created."))



        self.stdout.write("Starting reservation seeding...")

        users = list(UserProfile.objects.all())
        restaurants = list(Restaurant.objects.all())

        if not users or not restaurants:
            self.stdout.write(self.style.ERROR("Users or Restaurants missing. Seed them first."))
            return

        # ------------------------------------------------------------------
        # 🔥 Generate Reservations Without CSV
        # ------------------------------------------------------------------
        created_count = 0

        for _ in range(RESERVATION_COUNT):
            user = random.choice(users)
            restaurant = random.choice(restaurants)

            # Ensure restaurant has tables
            tables = list(restaurant.tables.all())
            if not tables:
                continue  # skip restaurants without tables

            table = random.choice(tables)

            # Generate reservation time
            days_ahead = random.randint(1, 20)

            reservation_time = timezone.now() + timedelta(days=days_ahead)

            # Create reservation
            Reservation.objects.update_or_create(
                user=user,
                restaurant=restaurant,
                table=table,
                reservation_time=reservation_time,
                defaults={
                    "guest_count": random.randint(1, 6),
                }
            )
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f"{created_count} reservations created successfully!"))


        self.stdout.write(self.style.SUCCESS("DB seeding completed successfully."))
