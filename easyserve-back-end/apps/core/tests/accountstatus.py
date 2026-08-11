from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


class AccountStatusViewTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', password='testpassword', email='test@gmail.com')
        # Replace with your actual URL pattern name
        self.view_url = reverse('account-status')

    def test_account_status_active(self):
        self.user.is_active = True
        self.user.save()

        response = self.client.post(
            self.view_url, data={'email': 'test@gmail.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['message'], True)

    def test_account_status_inactive(self):
        self.user.is_active = False
        self.user.save()

        response = self.client.post(
            self.view_url, data={'email': 'test@gmail.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['message'], False)

    def test_account_status_user_not_found(self):
        response = self.client.post(reverse(
            'account-status'), data={'email': 'nonexistentuser@gmail.com'})  # User does not exist
        self.assertEqual(response.status_code,
                         status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(
            response.json()['message'], "No User matches the given query.")
