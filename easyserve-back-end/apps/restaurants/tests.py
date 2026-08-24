from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.core.models.user import User
from apps.userprofile.models import UserProfile
from apps.restaurants.models import Restaurant, Menu, MenuItem, Table, Orders, OrderItem
from apps.restaurants.constants import OrderStatus


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
