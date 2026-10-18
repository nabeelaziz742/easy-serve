"""Forgot password email and the reset link."""
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.core.models import User
from apps.core.models.forgetpassword import ForgetPassword


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="reset@qa.qa", email="reset@qa.qa", password="OldPass123!", is_active=True,
        )

    def test_forgot_password_creates_link_and_reset_sets_new_password(self):
        res = self.client.post("/api/user/forget-password/", {"email": "reset@qa.qa"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        token = ForgetPassword.objects.get(user=self.user).token
        self.assertTrue(token)

        res = self.client.post(f"/api/user/reset-password/{token}", {"new_password": "NewPass123!"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass123!"))
        self.assertFalse(ForgetPassword.objects.filter(user=self.user).exists())

    def test_wrong_token_is_rejected(self):
        res = self.client.post("/api/user/reset-password/nope", {"new_password": "NewPass123!"}, format="json")
        self.assertNotEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass123!"))

    @override_settings(REACT_DOMAIN="https://app.example.com")
    def test_email_link_points_at_reset_page(self):
        with patch("apps.core.views.forget_password.send_mail") as send:
            self.client.post("/api/user/forget-password/", {"email": "reset@qa.qa"}, format="json")
        token = ForgetPassword.objects.get(user=self.user).token
        self.assertEqual(send.call_args.kwargs["key"]["button"], f"https://app.example.com/auth/reset-password/{token}")
