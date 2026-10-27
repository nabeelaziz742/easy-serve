import tempfile

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.restaurants.models import Menu, MenuItem, Restaurant
from apps.userprofile.models import UserProfile

User = get_user_model()


def account(user_type, username, restaurant=None):
    user = User.objects.create_user(
        email=f"{username}@example.com", username=username, password="pass12345",
        user_type=user_type, is_active=True,
    )
    UserProfile.objects.create(user=user, first_name=username, last_name="", restaurant=restaurant)
    return user


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class MenuItemAvailabilityTests(TestCase):
    """A manager can mark an item out of stock; guests then cannot order it."""

    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Karachi Grill")
        menu = Menu.objects.create(name="Main", restaurant=self.restaurant)
        self.item = MenuItem.objects.create(name="Biryani", price=500, menu=menu)
        self.manager = account("manager", "manager", self.restaurant)
        self.client = APIClient()

    def toggle(self, user, available):
        self.client.force_authenticate(user)
        return self.client.patch(
            f"/api/owner-menu-items/{self.item.id}/", {"is_available": available}, format="json"
        )

    def test_manager_toggles_and_guest_menu_shows_it(self):
        res = self.toggle(self.manager, False)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.item.refresh_from_db()
        self.assertFalse(self.item.is_available)

        menu = APIClient().get(f"/api/restaurants/restaurants/{self.restaurant.id}/menus/").data
        self.assertFalse(menu["menus"][0]["menu_items"][0]["is_available"])

        self.toggle(self.manager, True)
        self.item.refresh_from_db()
        self.assertTrue(self.item.is_available)

    def test_manager_of_another_restaurant_cannot_toggle(self):
        other = account("manager", "other", Restaurant.objects.create(name="Lahore Tikka"))
        self.assertEqual(self.toggle(other, False).status_code, status.HTTP_403_FORBIDDEN)
        self.item.refresh_from_db()
        self.assertTrue(self.item.is_available)

    def test_out_of_stock_item_cannot_be_added_to_cart_or_ordered(self):
        self.item.is_available = False
        self.item.save()
        customer = account("user", "customer")
        self.client.force_authenticate(customer)

        res = self.client.post("/api/restaurants/cart/create-cart-item/", {"menu_item": self.item.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("out of stock", res.data["error"])

        res = self.client.post(
            "/api/restaurants/orders/checkout-order/",
            {"order_type": "TAKEAWAY", "items": [{"menu_item": self.item.id, "quantity": 1}]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
