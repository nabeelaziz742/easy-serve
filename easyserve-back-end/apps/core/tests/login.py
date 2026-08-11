from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


class LoginAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.login_url = reverse('token_obtain_pair')
        self.username = 'testuser'
        self.password = 'testpassword'
        self.email = 'ali@gmail.com'
        self.user = User.objects.create_user(
            username=self.username, password=self.password,
            email=self.email)
        self.user.is_active = True
        self.user.save()

    def test_login_valid_user(self):
        data = {
            'username': self.username,
            'email': self.email,
            'password': self.password
        }

        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertIn('token', response.data)

    def test_login_invalid_user(self):
        data = {
            'email': 'invalid@gmail.com',
            'password': 'invalidpassword'
        }

        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
