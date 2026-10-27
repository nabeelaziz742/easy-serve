import tempfile
from urllib.parse import parse_qs, urlparse

from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.restaurants.models import Restaurant, Table

VALIDATE_URL = "/api/restaurants/dine-in/validate/"
START_URL = "/api/restaurants/dine-in/start-session/"


@override_settings(MEDIA_ROOT=tempfile.mkdtemp(), REACT_DOMAIN="https://app.example.com")
class TableQrKeyTests(TestCase):
    """A table only opens for a scan that carries its secret QR key."""

    def setUp(self):
        self.client = APIClient()
        self.restaurant = Restaurant.objects.create(name="Karachi Grill", is_active=True)
        self.other_restaurant = Restaurant.objects.create(name="Lahore Tikka", is_active=True)
        self.table = Table.objects.create(restaurant=self.restaurant, table_number=1, capacity=4)
        self.other_table = Table.objects.create(restaurant=self.other_restaurant, table_number=1, capacity=4)

    def scan(self, table=None, key=None, **extra):
        table = table or self.table
        return {
            "restaurant": table.restaurant_id,
            "table": table.table_number,
            "key": table.qr_key if key is None else key,
            **extra,
        }

    def test_every_table_gets_its_own_key_in_the_qr_link(self):
        self.assertNotEqual(self.table.qr_key, self.other_table.qr_key)
        self.assertGreaterEqual(len(self.table.qr_key), 20)

        url = urlparse(self.table.qr_url)
        self.assertEqual(f"{url.scheme}://{url.netloc}", "https://app.example.com")
        self.assertEqual(url.path, f"/restaurant/{self.restaurant.id}")
        self.assertEqual(
            parse_qs(url.query),
            {"mode": ["dine-in"], "table": ["1"], "key": [self.table.qr_key]},
        )

    def test_qr_image_name_does_not_reveal_the_table(self):
        name = self.table.qr_code.name
        self.assertTrue(name.startswith("qr_codes/table_"))
        self.assertNotIn(f"_{self.restaurant.id}_{self.table.table_number}", name)

    def test_validate_with_key_opens_the_menu(self):
        res = self.client.post(VALIDATE_URL, self.scan(), format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["restaurant"]["id"], self.restaurant.id)
        self.assertEqual(res.data["table"]["number"], 1)

    def test_validate_without_or_with_wrong_key_is_rejected(self):
        for key in ("", "guessed-key", "kéy-ünicode", self.other_table.qr_key):
            res = self.client.post(VALIDATE_URL, self.scan(key=key), format="json")
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND, key)

    def test_unknown_or_malformed_table_is_rejected_not_500(self):
        for data in (
            {"restaurant": self.restaurant.id, "table": 99, "key": self.table.qr_key},
            {"restaurant": "abc", "table": 1, "key": self.table.qr_key},
            {"restaurant": self.restaurant.id, "table": "x", "key": self.table.qr_key},
        ):
            res = self.client.post(VALIDATE_URL, data, format="json")
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND, data)

        res = self.client.post(VALIDATE_URL, {"restaurant": self.restaurant.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["detail"], "restaurant and table are required")

    def test_inactive_restaurant_or_table_is_rejected(self):
        self.table.is_active = False
        self.table.save()
        self.assertEqual(self.client.post(VALIDATE_URL, self.scan(), format="json").status_code, 404)

        self.other_restaurant.is_active = False
        self.other_restaurant.save()
        res = self.client.post(VALIDATE_URL, self.scan(self.other_table), format="json")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.data["detail"], "This restaurant is not currently available.")

    def test_session_cannot_be_started_without_the_key(self):
        res = self.client.post(START_URL, self.scan(key="", guests=2), format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.table.refresh_from_db()
        self.assertFalse(self.table.dine_in_sessions.exists())

    def test_running_session_token_is_only_shared_with_key_holders(self):
        start = self.client.post(START_URL, self.scan(guests=2), format="json")
        self.assertEqual(start.status_code, status.HTTP_200_OK, start.data)
        token = start.data["session"]["token"]

        # Someone who changed the numbers in the link learns nothing.
        guessed = self.client.post(VALIDATE_URL, self.scan(key="guess"), format="json")
        self.assertEqual(guessed.status_code, status.HTTP_404_NOT_FOUND)
        self.assertNotIn(token, str(guessed.data))

        # A friend at the table who scans the same QR joins the bill.
        friend = self.client.post(VALIDATE_URL, self.scan(), format="json")
        self.assertTrue(friend.data["active_session"])
        self.assertEqual(str(friend.data["session"]["token"]), token)

    def test_rotating_the_key_retires_the_old_print(self):
        old_key, old_image = self.table.qr_key, self.table.qr_code.name
        self.table.rotate_qr_key()
        self.table.refresh_from_db()

        self.assertNotEqual(self.table.qr_key, old_key)
        self.assertNotEqual(self.table.qr_code.name, old_image)
        self.assertEqual(self.client.post(VALIDATE_URL, self.scan(key=old_key), format="json").status_code, 404)
        self.assertEqual(self.client.post(VALIDATE_URL, self.scan(), format="json").status_code, 200)
