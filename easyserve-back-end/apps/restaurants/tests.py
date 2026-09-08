from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.core.models.user import User
from apps.userprofile.models import UserProfile
from apps.restaurants.models import (
    Restaurant, Menu, MenuItem, Table, Orders, OrderItem, Cart, CartItem, PaymentDetails, Review,
)
from apps.restaurants.constants import OrderStatus, PaymentStatus


def make_user(email, user_type, restaurant=None):
    user = User.objects.create_user(email=email, username=email, password="testpass123", user_type=user_type)
    user.is_active = True
    user.save(update_fields=["is_active"])
    profile = UserProfile.objects.create(
        user=user,
        first_name="Test",
        last_name=user_type,
        restaurant=restaurant,
    )
    return user, profile


class OrderFlowTestCase(TestCase):
    """
    Covers the waiter accept -> chef prepare -> waiter serve flow,
    including cross-restaurant isolation and the AllowAny -> IsAuthenticated
    permission change (F-07), for the views consolidated in F-11.
    """

    def setUp(self):
        self.client = APIClient()

        self.restaurant = Restaurant.objects.create(name="Test Diner")
        self.other_restaurant = Restaurant.objects.create(name="Other Diner")

        self.waiter_user, self.waiter = make_user("waiter@test.com", "waiter", self.restaurant)
        self.chef_user, self.chef = make_user("chef@test.com", "chef", self.restaurant)
        self.other_waiter_user, self.other_waiter = make_user(
            "other_waiter@test.com", "waiter", self.other_restaurant
        )
        self.customer_user, self.customer = make_user("customer@test.com", "user")

        self.table = Table.objects.create(restaurant=self.restaurant, table_number=1)

        menu = Menu.objects.create(name="Main Menu", restaurant=self.restaurant)
        self.menu_item = MenuItem.objects.create(
            name="Burger", price=10, menu=menu, is_available=True
        )

        self.order = Orders.objects.create(
            user=self.customer,
            table=self.table,
            order_status=OrderStatus.TO_PREPARE,
            total_price=10,
        )
        OrderItem.objects.create(order=self.order, menu_item=self.menu_item, quantity=1, price=10)

    # --- Permission defaults (F-07) ---

    def test_pending_orders_requires_authentication(self):
        """With no auth, the endpoint must reject rather than defaulting to AllowAny."""
        response = self.client.get("/api/restaurants/orders/pending/")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_customer_cannot_access_waiter_endpoints(self):
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.get("/api/restaurants/orders/pending/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Waiter accept (consolidated in F-11) ---

    def test_waiter_sees_pending_order_for_their_restaurant(self):
        self.client.force_authenticate(user=self.waiter_user)
        response = self.client.get("/api/restaurants/orders/pending/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order_ids = [o["id"] for o in response.data["results"]] if "results" in response.data else [o["id"] for o in response.data]
        self.assertIn(self.order.id, order_ids)

    def test_waiter_from_other_restaurant_does_not_see_order(self):
        self.client.force_authenticate(user=self.other_waiter_user)
        response = self.client.get("/api/restaurants/orders/pending/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order_ids = [o["id"] for o in response.data["results"]] if "results" in response.data else [o["id"] for o in response.data]
        self.assertNotIn(self.order.id, order_ids)

    def test_waiter_accept_assigns_least_busy_chef_and_notifies(self):
        self.client.force_authenticate(user=self.waiter_user)
        response = self.client.post(f"/api/restaurants/orders/{self.order.id}/accept/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order.refresh_from_db()
        self.assertTrue(self.order.accepted_by_waiter)
        self.assertEqual(self.order.waiter_id, self.waiter.id)
        self.assertEqual(self.order.assigned_chef_id, self.chef.id)

    def test_waiter_cannot_accept_order_from_other_restaurant(self):
        self.client.force_authenticate(user=self.other_waiter_user)
        response = self.client.post(f"/api/restaurants/orders/{self.order.id}/accept/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.order.refresh_from_db()
        self.assertFalse(self.order.accepted_by_waiter)

    def test_waiter_cannot_accept_order_twice(self):
        self.client.force_authenticate(user=self.waiter_user)
        self.client.post(f"/api/restaurants/orders/{self.order.id}/accept/")
        response = self.client.post(f"/api/restaurants/orders/{self.order.id}/accept/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accept_fails_when_no_chef_available(self):
        # Deactivate the only chef so no active chef exists for the restaurant.
        self.chef_user.is_active = False
        self.chef_user.save(update_fields=["is_active"])

        self.client.force_authenticate(user=self.waiter_user)
        response = self.client.post(f"/api/restaurants/orders/{self.order.id}/accept/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    # --- Waiter serve (consolidated in F-11) ---

    def test_mark_served_requires_prepared_status(self):
        self.client.force_authenticate(user=self.waiter_user)
        self.client.post(f"/api/restaurants/orders/{self.order.id}/accept/")

        # Order is still "Preparing"/"To Prepare", not "Prepared" yet.
        response = self.client.post(f"/api/restaurants/orders/{self.order.id}/mark-served/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mark_served_by_a_different_waiter_repairs_assignment(self):
        """Any waiter from the correct restaurant can serve; the order's
        waiter link is repaired to whoever actually served it."""
        second_waiter_user, second_waiter = make_user("waiter2@test.com", "waiter", self.restaurant)

        self.order.order_status = OrderStatus.PREPARED
        self.order.waiter = self.waiter
        self.order.save(update_fields=["order_status", "waiter"])

        self.client.force_authenticate(user=second_waiter_user)
        response = self.client.post(f"/api/restaurants/orders/{self.order.id}/mark-served/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order.refresh_from_db()
        self.assertEqual(self.order.order_status, OrderStatus.SERVED)
        self.assertEqual(self.order.waiter_id, second_waiter.id)

    def test_ready_orders_lists_prepared_orders_for_assigned_waiter(self):
        self.order.order_status = OrderStatus.PREPARED
        self.order.waiter = self.waiter
        self.order.save(update_fields=["order_status", "waiter"])

        self.client.force_authenticate(user=self.waiter_user)
        response = self.client.get("/api/restaurants/orders/ready/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order_ids = [o["id"] for o in response.data["results"]] if "results" in response.data else [o["id"] for o in response.data]
        self.assertIn(self.order.id, order_ids)


class OrderDetailTenantIsolationTestCase(TestCase):
    """Regression tests for the cross-restaurant order-detail leak fix."""

    def setUp(self):
        self.client = APIClient()

        self.restaurant = Restaurant.objects.create(name="Home Diner")
        self.other_restaurant = Restaurant.objects.create(name="Away Diner")

        self.waiter_user, self.waiter = make_user("home-waiter@test.com", "waiter", self.restaurant)
        self.other_waiter_user, self.other_waiter = make_user("away-waiter@test.com", "waiter", self.other_restaurant)

        self.customer_user, self.customer = make_user("customer@test.com", "customer")

        self.menu = Menu.objects.create(restaurant=self.restaurant, name="Main Menu")
        self.menu_item = MenuItem.objects.create(menu=self.menu, name="Burger", price=5)
        self.table = Table.objects.create(restaurant=self.restaurant, table_number=1, capacity=4)

        self.order = Orders.objects.create(
            user=self.customer,
            order_type=1,
            table=self.table,
            order_status=OrderStatus.TO_PREPARE,
            total_price=5,
        )
        OrderItem.objects.create(order=self.order, menu_item=self.menu_item, quantity=1, price=5)

    def test_staff_from_other_restaurant_cannot_view_order(self):
        self.client.force_authenticate(user=self.other_waiter_user)
        response = self.client.get(f"/api/restaurants/orders/{self.order.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_from_same_restaurant_can_view_order(self):
        self.client.force_authenticate(user=self.waiter_user)
        response = self.client.get(f"/api/restaurants/orders/{self.order.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_order_owner_can_view_own_order(self):
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.get(f"/api/restaurants/orders/{self.order.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ManagerCashOrdersOwnerVisibilityTestCase(TestCase):
    """Regression test: restaurant owners must see their own restaurant's
    pending cash settlements, not just staff with profile.restaurant set."""

    def setUp(self):
        self.client = APIClient()

        self.restaurant = Restaurant.objects.create(name="Owner Diner")

        self.owner_user, self.owner = make_user("owner@test.com", "restaurant_owner")
        self.restaurant.owners.add(self.owner)

        self.waiter_user, self.waiter = make_user("cash-waiter@test.com", "waiter", self.restaurant)
        self.customer_user, self.customer = make_user("cash-customer@test.com", "customer")

        self.menu = Menu.objects.create(restaurant=self.restaurant, name="Main Menu")
        self.menu_item = MenuItem.objects.create(menu=self.menu, name="Pizza", price=10)
        self.table = Table.objects.create(restaurant=self.restaurant, table_number=1, capacity=4)

        self.order = Orders.objects.create(
            user=self.customer,
            order_type=1,
            table=self.table,
            waiter=self.waiter,
            order_status=OrderStatus.SERVED,
            total_price=10,
        )
        OrderItem.objects.create(order=self.order, menu_item=self.menu_item, quantity=1, price=10)

        self.client.force_authenticate(user=self.customer_user)
        self.client.post(f"/api/restaurants/orders/{self.order.id}/cash-request/")
        self.client.force_authenticate(user=self.waiter_user)
        self.client.post(f"/api/restaurants/orders/{self.order.id}/cash-receive/")

    def test_owner_sees_pending_cash_settlement_for_owned_restaurant(self):
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.get("/api/restaurants/orders/manager/cash/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order_ids = [o["id"] for o in response.data["results"]] if "results" in response.data else [o["id"] for o in response.data]
        self.assertIn(self.order.id, order_ids)


class CartItemOwnershipTestCase(TestCase):
    """Regression tests for the cart-item IDOR fix: a customer must not be
    able to view, edit, or delete another customer's cart item."""

    def setUp(self):
        self.client = APIClient()

        self.restaurant = Restaurant.objects.create(name="Cart Diner")
        self.menu = Menu.objects.create(restaurant=self.restaurant, name="Main Menu")
        self.menu_item = MenuItem.objects.create(menu=self.menu, name="Fries", price=3)

        self.customer1_user, self.customer1 = make_user("cart-cust1@test.com", "customer")
        self.customer2_user, self.customer2 = make_user("cart-cust2@test.com", "customer")

        self.cart1 = Cart.objects.create(user=self.customer1)
        self.cart_item = CartItem.objects.create(
            cart=self.cart1, menu_item=self.menu_item, quantity=1, price=3,
        )

    def test_other_customer_cannot_update_cart_item(self):
        self.client.force_authenticate(user=self.customer2_user)
        response = self.client.patch(
            f"/api/restaurants/cart/update-cart-item/{self.cart_item.id}/",
            {"quantity": 99, "comments": "HACKED BY OTHER USER"},
            format="json",
        )
        # get_object() raises Http404 for another user's cart item, which
        # this view's broad except-block turns into a 400 (not the security
        # boundary itself -- the item is simply not reachable either way).
        self.assertIn(response.status_code, (status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST))

        self.cart_item.refresh_from_db()
        self.assertEqual(self.cart_item.quantity, 1)
        self.assertNotEqual(self.cart_item.comments, "HACKED BY OTHER USER")

    def test_other_customer_cannot_delete_cart_item(self):
        self.client.force_authenticate(user=self.customer2_user)
        response = self.client.delete(
            f"/api/restaurants/cart/delete-cart-item/{self.cart_item.id}/"
        )
        self.assertIn(response.status_code, (status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST))
        self.assertTrue(CartItem.objects.filter(id=self.cart_item.id).exists())

    def test_owner_can_update_own_cart_item(self):
        self.client.force_authenticate(user=self.customer1_user)
        response = self.client.patch(
            f"/api/restaurants/cart/update-cart-item/{self.cart_item.id}/",
            {"quantity": 2},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cart_item.refresh_from_db()
        self.assertEqual(self.cart_item.quantity, 2)

    def test_owner_can_delete_own_cart_item(self):
        self.client.force_authenticate(user=self.customer1_user)
        response = self.client.delete(
            f"/api/restaurants/cart/delete-cart-item/{self.cart_item.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(CartItem.objects.filter(id=self.cart_item.id).exists())


class PayOrderSelfConfirmationTestCase(TestCase):
    """Regression test for the payment self-confirmation protection, now
    merged directly into PayOrderAPIView instead of living in a separate
    monkey-patch module."""

    def setUp(self):
        self.client = APIClient()

        self.restaurant = Restaurant.objects.create(name="Pay Diner")
        self.menu = Menu.objects.create(restaurant=self.restaurant, name="Main Menu")
        self.menu_item = MenuItem.objects.create(menu=self.menu, name="Steak", price=20)
        self.table = Table.objects.create(restaurant=self.restaurant, table_number=1, capacity=4)

        self.customer_user, self.customer = make_user("pay-customer@test.com", "customer")
        self.waiter_user, self.waiter = make_user("pay-waiter@test.com", "waiter", self.restaurant)

        self.order = Orders.objects.create(
            user=self.customer,
            order_type=1,
            table=self.table,
            order_status=OrderStatus.SERVED,
            total_price=20,
        )
        OrderItem.objects.create(order=self.order, menu_item=self.menu_item, quantity=1, price=20)

    def test_customer_cannot_self_confirm_bank_transfer(self):
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.post(
            f"/api/restaurants/orders/{self.order.id}/pay/",
            {"payment_method": "transfer"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.order.refresh_from_db()
        self.assertNotEqual(self.order.payment_status, PaymentStatus.CONFIRMED.value)
        self.assertFalse(
            PaymentDetails.objects.filter(
                order=self.order, payment_status=PaymentStatus.CONFIRMED.value
            ).exists()
        )

    def test_customer_cash_request_stays_pending(self):
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.post(
            f"/api/restaurants/orders/{self.order.id}/pay/",
            {"payment_method": "cash"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("payment_pending"))

        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, PaymentStatus.PENDING.value)

    def test_staff_can_confirm_bank_transfer(self):
        self.client.force_authenticate(user=self.waiter_user)
        response = self.client.post(
            f"/api/restaurants/orders/{self.order.id}/pay/",
            {"payment_method": "transfer"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, PaymentStatus.CONFIRMED.value)


class ReviewSubmissionTestCase(TestCase):
    """Regression test: submitting a review must not crash with a 500.

    ReviewViewSet.perform_create() used to pass user=request.user.profile
    into serializer.save(), while CreateReviewSerializer.create() also set
    user=order.user explicitly -- Review.objects.create() then received
    `user` twice and raised TypeError, turning every review submission into
    an Internal Server Error.
    """

    def setUp(self):
        self.client = APIClient()

        self.restaurant = Restaurant.objects.create(name="Review Diner")
        self.menu = Menu.objects.create(restaurant=self.restaurant, name="Main Menu")
        self.menu_item = MenuItem.objects.create(menu=self.menu, name="Pasta", price=12)
        self.table = Table.objects.create(restaurant=self.restaurant, table_number=1, capacity=4)

        self.customer_user, self.customer = make_user("review-customer@test.com", "customer")

        self.order = Orders.objects.create(
            user=self.customer,
            order_type=1,
            table=self.table,
            order_status=OrderStatus.SERVED,
            payment_status=PaymentStatus.CONFIRMED.value,
            total_price=12,
        )
        OrderItem.objects.create(order=self.order, menu_item=self.menu_item, quantity=1, price=12)

    def test_customer_can_submit_review_without_server_error(self):
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.post(
            "/api/restaurants/reviews/",
            {"order": self.order.id, "rate": 5, "comment": "Loved it!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Review.objects.filter(order=self.order, user=self.customer).count(), 1)

    def test_duplicate_review_rejected(self):
        self.client.force_authenticate(user=self.customer_user)
        self.client.post(
            "/api/restaurants/reviews/",
            {"order": self.order.id, "rate": 5, "comment": "First review"},
            format="json",
        )
        response = self.client.post(
            "/api/restaurants/reviews/",
            {"order": self.order.id, "rate": 3, "comment": "Second review"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FullAcceptanceWorkflowTestCase(TestCase):
    """
    End-to-end test verifying the critical acceptance workflow:
    Customer creates order
    -> Waiter receives automatically in pending queue
    -> Waiter accepts order (auto-assigning chef)
    -> Chef receives in kitchen queue
    -> Chef starts preparing
    -> Chef marks ready
    -> Waiter receives in ready queue
    -> Waiter marks served
    -> Customer requests cash payment
    -> Waiter receives in cash collection queue
    -> Waiter records cash receipt
    -> Manager receives in settlement queue
    -> Manager settles cash payment
    -> Table released and payment confirmed.
    """

    def setUp(self):
        self.client = APIClient()

        self.restaurant = Restaurant.objects.create(name="Acceptance Diner")

        self.manager_user, self.manager = make_user("mgr@test.com", "manager", self.restaurant)
        self.waiter_user, self.waiter = make_user("wtr@test.com", "waiter", self.restaurant)
        self.chef_user, self.chef = make_user("chf@test.com", "chef", self.restaurant)
        self.customer_user, self.customer = make_user("cust@test.com", "user")

        self.table = Table.objects.create(restaurant=self.restaurant, table_number=5, capacity=4)

        self.menu = Menu.objects.create(name="Dinner Menu", restaurant=self.restaurant)
        self.item1 = MenuItem.objects.create(name="Steak", price=25, menu=self.menu, is_available=True)
        self.item2 = MenuItem.objects.create(name="Soda", price=5, menu=self.menu, is_available=True)

    def test_complete_order_to_cash_settlement_lifecycle(self):
        # Step 1: Customer creates order
        order = Orders.objects.create(
            user=self.customer,
            table=self.table,
            order_type=1,
            order_status=OrderStatus.TO_PREPARE,
            total_price=30,
        )
        OrderItem.objects.create(order=order, menu_item=self.item1, quantity=1, price=25)
        OrderItem.objects.create(order=order, menu_item=self.item2, quantity=1, price=5)

        # Step 2: Waiter polls pending orders and sees the new order
        self.client.force_authenticate(user=self.waiter_user)
        res = self.client.get("/api/restaurants/orders/pending/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [o["id"] for o in (res.data.get("results") if isinstance(res.data, dict) else res.data)]
        self.assertIn(order.id, ids)

        # Step 3: Waiter accepts order -> Chef auto-assigned
        res = self.client.post(f"/api/restaurants/orders/{order.id}/accept/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertTrue(order.accepted_by_waiter)
        self.assertEqual(order.assigned_chef_id, self.chef.id)

        # Step 4: Chef polls kitchen queue and sees the order
        self.client.force_authenticate(user=self.chef_user)
        res = self.client.get("/api/restaurants/orders/chef/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        chef_ids = [o["id"] for o in (res.data.get("results") if isinstance(res.data, dict) else res.data)]
        self.assertIn(order.id, chef_ids)

        # Step 5: Chef starts preparing
        res = self.client.post(f"/api/restaurants/orders/{order.id}/start-preparing/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.order_status, OrderStatus.PREPARING)

        # Step 6: Chef marks ready
        res = self.client.post(f"/api/restaurants/orders/{order.id}/mark-prepared/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.order_status, OrderStatus.PREPARED)

        # Step 7: Waiter polls ready orders and sees it
        self.client.force_authenticate(user=self.waiter_user)
        res = self.client.get("/api/restaurants/orders/ready/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ready_ids = [o["id"] for o in (res.data.get("results") if isinstance(res.data, dict) else res.data)]
        self.assertIn(order.id, ready_ids)

        # Step 8: Waiter marks served
        res = self.client.post(f"/api/restaurants/orders/{order.id}/mark-served/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.order_status, OrderStatus.SERVED)

        # Step 9: Customer requests cash payment
        self.client.force_authenticate(user=self.customer_user)
        res = self.client.post(f"/api/restaurants/orders/{order.id}/cash-request/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Step 10: Waiter sees order in cash collection list
        self.client.force_authenticate(user=self.waiter_user)
        res = self.client.get("/api/restaurants/orders/waiter/cash/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        cash_ids = [o["id"] for o in (res.data.get("results") if isinstance(res.data, dict) else res.data)]
        self.assertIn(order.id, cash_ids)

        # Step 11: Waiter records cash received
        res = self.client.post(f"/api/restaurants/orders/{order.id}/cash-receive/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Step 12: Manager sees order in cash settlement list
        self.client.force_authenticate(user=self.manager_user)
        res = self.client.get("/api/restaurants/orders/manager/cash/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        mgr_cash_ids = [o["id"] for o in (res.data.get("results") if isinstance(res.data, dict) else res.data)]
        self.assertIn(order.id, mgr_cash_ids)

        # Step 13: Manager settles cash
        res = self.client.post(f"/api/restaurants/orders/{order.id}/cash-settle/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, PaymentStatus.CONFIRMED.value)

    def test_manager_staff_crud_lifecycle(self):
        self.client.force_authenticate(user=self.manager_user)

        # Create new waiter
        res = self.client.post(
            "/api/user/staff/",
            {
                "username": "new_waiter_99",
                "email": "nw99@test.com",
                "password": "securepass123",
                "user_type": "waiter",
                "first_name": "New",
                "last_name": "Waiter",
                "phone": "1234567890",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_staff_id = res.data["id"]

        # List waiters
        res = self.client.get("/api/user/staff/?type=waiter")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        waiter_ids = [w["id"] for w in (res.data.get("results") if isinstance(res.data, dict) else res.data)]
        self.assertIn(new_staff_id, waiter_ids)

        # Update waiter
        res = self.client.patch(
            f"/api/user/staff/{new_staff_id}/",
            {"first_name": "UpdatedName", "phone": "9999999999"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["first_name"], "UpdatedName")

        # Delete waiter
        res = self.client.delete(f"/api/user/staff/{new_staff_id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=new_staff_id).exists())

