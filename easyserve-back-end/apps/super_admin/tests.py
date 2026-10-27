import tempfile

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.restaurants.models import Restaurant, Table
from apps.userprofile.models import UserProfile

User = get_user_model()

ONBOARD_URL = "/api/superadmin/restaurants/"
TABLES_URL = "/api/dashboard/tables/"


def staff(user_type, username, restaurant=None):
    user = User.objects.create_user(
        email=f"{username}@example.com", username=username, password="pass12345",
        user_type=user_type, is_active=True,
    )
    UserProfile.objects.create(user=user, first_name=username, last_name="", restaurant=restaurant)
    return user


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class RestaurantOnboardingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = staff("super_admin", "admin")
        self.client.force_authenticate(self.admin)

    def payload(self, **overrides):
        return {
            "name": "Karachi Grill",
            "address": "Clifton Block 5",
            "city": "Karachi",
            "phone_number": "0300-1234567",
            "manager": {
                "first_name": "Ali", "last_name": "Raza", "username": "ali.manager",
                "email": "ali@karachigrill.pk", "password": "StrongPass#1",
            },
            "table_count": 12,
            **overrides,
        }

    def test_creates_restaurant_active_manager_and_tables(self):
        res = self.client.post(ONBOARD_URL, self.payload(), format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        restaurant = Restaurant.objects.get(name="Karachi Grill")
        self.assertEqual(res.data["id"], restaurant.id)
        self.assertEqual(res.data["table_count"], 12)
        self.assertEqual(res.data["manager"]["username"], "ali.manager")

        manager = User.objects.get(username="ali.manager")
        self.assertEqual(manager.user_type, "manager")
        self.assertTrue(manager.is_active)
        self.assertTrue(manager.check_password("StrongPass#1"))
        self.assertEqual(manager.profile.restaurant, restaurant)
        self.assertEqual(manager.profile.first_name, "Ali")

        self.assertEqual(list(restaurant.menus.values_list("name", flat=True)), ["Main Menu"])

        tables = list(restaurant.tables.order_by("table_number"))
        self.assertEqual([t.table_number for t in tables], list(range(1, 13)))
        self.assertTrue(all(t.qr_code and t.qr_key for t in tables))

    def test_manager_can_log_in_and_see_the_new_tables_with_qr(self):
        self.client.post(ONBOARD_URL, self.payload(), format="json")
        manager = User.objects.get(username="ali.manager")

        client = APIClient()
        client.force_authenticate(manager)
        res = client.get(TABLES_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        tables = res.data
        self.assertEqual([t["number"] for t in tables], list(range(1, 13)))
        self.assertTrue(tables[0]["qrCode"].startswith("http://testserver/media/qr_codes/"))
        self.assertEqual(tables[0]["restaurant"], "Karachi Grill")

        me = client.get("/api/user/me/").data
        self.assertEqual(me["profile"]["restaurant"]["id"], Restaurant.objects.get(name="Karachi Grill").id)

    def test_waiters_do_not_receive_the_qr_link(self):
        self.client.post(ONBOARD_URL, self.payload(), format="json")
        waiter = staff("waiter", "waiter1", Restaurant.objects.get(name="Karachi Grill"))
        client = APIClient()
        client.force_authenticate(waiter)
        res = client.get(TABLES_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data[0]["qrCode"])

    def test_nothing_is_created_when_any_part_is_invalid(self):
        staff("waiter", "taken")
        cases = [
            self.payload(manager={**self.payload()["manager"], "username": "TAKEN"}),
            self.payload(manager={**self.payload()["manager"], "email": "taken@example.com"}),
            self.payload(table_count=0),
            self.payload(table_count=101),
            self.payload(name=""),
        ]
        for data in cases:
            res = self.client.post(ONBOARD_URL, data, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, data)
        self.assertFalse(Restaurant.objects.exists())
        self.assertFalse(Table.objects.exists())

    def test_duplicate_restaurant_name_is_rejected(self):
        Restaurant.objects.create(name="Karachi Grill")
        res = self.client.post(ONBOARD_URL, self.payload(), format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", res.data)
        self.assertFalse(User.objects.filter(username="ali.manager").exists())

    def test_only_super_admin_can_onboard(self):
        for user_type in ("manager", "restaurant_owner", "waiter", "user"):
            client = APIClient()
            client.force_authenticate(staff(user_type, f"u_{user_type}"))
            res = client.post(ONBOARD_URL, self.payload(), format="json")
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, user_type)
        self.assertEqual(APIClient().post(ONBOARD_URL, self.payload(), format="json").status_code, 401)
