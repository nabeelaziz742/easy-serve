import io
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from apps.restaurants.models import Restaurant, Table
from apps.userprofile.models import UserProfile

User = get_user_model()

ONBOARD_URL = "/api/superadmin/restaurants/"
TABLES_URL = "/api/dashboard/tables/"
LOGIN_URL = "/api/user/login/"
REFRESH_URL = "/api/user/token-refresh/"
ME_URL = "/api/user/me/"


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
            "open_time": "12:00",
            "close_time": "23:30",
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

        self.assertEqual(restaurant.hours.count(), 7)
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

    def test_lists_restaurants_with_manager_and_table_count(self):
        self.client.post(ONBOARD_URL, self.payload(), format="json")
        Restaurant.objects.create(name="Lahore Tikka")

        with self.assertNumQueries(3):  # restaurants (with table count), their managers, hours
            res = self.client.get(ONBOARD_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([r["name"] for r in res.data], ["Lahore Tikka", "Karachi Grill"])
        self.assertEqual(res.data[1]["manager"], {
            "username": "ali.manager", "email": "ali@karachigrill.pk",
            "first_name": "Ali", "last_name": "Raza", "phone": "",
        })
        self.assertEqual(res.data[1]["table_count"], 12)
        self.assertEqual((res.data[1]["open_time"], res.data[1]["close_time"]), ("12:00", "23:30"))
        self.assertIsNone(res.data[0]["manager"])
        self.assertEqual(res.data[0]["table_count"], 0)

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


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class RestaurantEditAndDisableTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Karachi Grill", city="Karachi")
        self.manager = staff("manager", "ali", self.restaurant)
        self.waiter = staff("waiter", "sara", self.restaurant)
        self.url = f"{ONBOARD_URL}{self.restaurant.id}/"
        self.admin = APIClient()
        self.admin.force_authenticate(staff("super_admin", "admin"))

    def login(self, username):
        return APIClient().post(LOGIN_URL, {"email": f"{username}@example.com", "password": "pass12345"}, format="json")

    def set_active(self, active):
        res = self.admin.patch(self.url, {"is_active": active}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["is_active"], active)

    def test_edits_restaurant_and_manager_login(self):
        res = self.admin.patch(self.url, {
            "city": "Lahore",
            "manager": {"first_name": "Ali", "email": "new@karachigrill.pk", "password": "NewPass#123"},
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["city"], "Lahore")
        self.assertEqual(res.data["manager"]["email"], "new@karachigrill.pk")

        self.manager.refresh_from_db()
        self.assertTrue(self.manager.check_password("NewPass#123"))
        self.assertEqual(self.manager.profile.first_name, "Ali")

    def test_rename_redraws_table_qr_codes_with_the_same_key(self):
        table = Table.objects.create(restaurant=self.restaurant, table_number=1)
        old_image, key = table.qr_code.name, table.qr_key

        res = self.admin.patch(self.url, {"name": "Karachi Grill & BBQ"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        table.refresh_from_db()
        self.assertNotEqual(table.qr_code.name, old_image)
        self.assertEqual(table.qr_key, key)

    def test_uploads_logo_shown_on_public_restaurant_list(self):
        buffer = io.BytesIO()
        Image.new("RGB", (40, 40), "orange").save(buffer, format="PNG")
        logo = SimpleUploadedFile("logo.png", buffer.getvalue(), content_type="image/png")

        res = self.admin.patch(self.url, {"logo": logo}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertIn("/media/restaurant_logos/", res.data["logo"])
        public = APIClient().get("/api/restaurants/restaurants/").data
        self.assertEqual(public[0]["logo"], res.data["logo"])

    def test_timings_update_every_open_day_and_keep_closed_days(self):
        self.restaurant.set_daily_hours("12:00", "23:00")
        self.restaurant.hours.filter(day_of_week=6).delete()  # manager closed Sundays

        res = self.admin.patch(self.url, {"open_time": "10:00", "close_time": "22:00"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual((res.data["open_time"], res.data["close_time"]), ("10:00", "22:00"))
        hours = list(self.restaurant.hours.values_list("day_of_week", "open_time", "close_time"))
        self.assertEqual([h[0] for h in hours], list(range(6)))
        self.assertTrue(all(str(h[1]) == "10:00:00" and str(h[2]) == "22:00:00" for h in hours))
        public = APIClient().get(f"/api/restaurants/restaurants/{self.restaurant.id}/").data
        self.assertEqual(public["hours"][0]["open_time"], "10:00:00")

    def test_both_times_are_needed(self):
        res = self.admin.patch(self.url, {"open_time": "10:00"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("close_time", res.data)

    def test_change_manager_moves_an_existing_manager(self):
        other = Restaurant.objects.create(name="Lahore Tikka")
        moved = staff("manager", "bilal", other)

        managers = self.admin.get("/api/superadmin/managers/").data
        self.assertIn({"id": moved.id, "username": "bilal", "email": "bilal@example.com", "name": "bilal",
                       "restaurant": {"id": other.id, "name": "Lahore Tikka"}}, managers)

        res = self.admin.patch(self.url, {"manager_id": moved.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["manager"]["username"], "bilal")
        moved.profile.refresh_from_db()
        self.manager.profile.refresh_from_db()
        self.assertEqual(moved.profile.restaurant, self.restaurant)
        self.assertIsNone(self.manager.profile.restaurant)  # old manager unlinked
        self.assertEqual(self.waiter.profile.restaurant, self.restaurant)  # staff untouched
        self.assertIsNone(self.admin.get(f"{ONBOARD_URL}{other.id}/").data["manager"])

    def test_change_manager_only_accepts_manager_accounts(self):
        res = self.admin.patch(self.url, {"manager_id": self.waiter.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("manager_id", res.data)

    def test_manager_email_must_be_unique(self):
        res = self.admin.patch(self.url, {"manager": {"email": "SARA@example.com"}}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", res.data["manager"])

    def test_disabling_locks_out_staff_and_guests_until_enabled(self):
        tokens = self.login("sara").data
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.assertEqual(api.get(ME_URL).status_code, status.HTTP_200_OK)

        self.set_active(False)
        for username in ("ali", "sara"):
            res = self.login(username)
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertIn("disabled", str(res.data["detail"]))
        self.assertEqual(api.get(ME_URL).status_code, status.HTTP_401_UNAUTHORIZED)
        refresh = APIClient().post(REFRESH_URL, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(refresh.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(APIClient().get(f"/api/restaurants/restaurants/{self.restaurant.id}/menus/").status_code, 404)
        self.assertEqual(self.admin.get(ONBOARD_URL).data[0]["is_active"], False)

        self.set_active(True)
        self.assertEqual(self.login("ali").status_code, status.HTTP_200_OK)
        self.assertEqual(api.get(ME_URL).status_code, status.HTTP_200_OK)

    def test_wrong_password_on_disabled_restaurant_keeps_generic_error(self):
        self.set_active(False)
        res = APIClient().post(LOGIN_URL, {"email": "ali@example.com", "password": "wrong"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("disabled", str(res.data["detail"]))
