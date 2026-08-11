from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailExistenceTestCase(TestCase):
    def setUp(self):
        # Create a test user with a known email address
        self.test_email = "test@example.com"
        User.objects.create_user(
            username="testuser", email=self.test_email, password="testpassword")

        # Initialize the test client
        self.client = APIClient()

    def test_email_exists(self):
        # Define the endpoint URL
        url = reverse('email-exist')

        # Data to be sent in the request
        data = {'email': self.test_email}

        # Send a POST request to the endpoint
        response = self.client.post(url, data, format='json')

        # Check if the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Check if the response data contains the 'exists' key set to True
        self.assertFalse(response.data['message'])

    def test_email_does_not_exist(self):
        # Define the endpoint URL
        url = reverse('email-exist')

        # Data to be sent in the request
        data = {'email': 'nonexistent@example.com'}

        # Send a POST request to the endpoint
        response = self.client.post(url, data, format='json')

        # Check if the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check if the response data contains the 'exists' key set to False
        self.assertTrue(response.data['message'])
