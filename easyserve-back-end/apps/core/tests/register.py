from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework import status
from django.urls import reverse
from django.core import mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

User = get_user_model()


class RegisterAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Replace with your actual URL pattern name
        self.register_url = reverse('register')

        # Test user data
        self.valid_user_data = {
            'username': 'newuser1',
            'email': 'newuser1@example.com',
            'password': 'newpassword',
        }

    def test_register_valid_user(self):
        response = self.client.post(
            self.register_url, self.valid_user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Check that a new user was created
        self.assertEqual(User.objects.count(), 1)
        # Check the username of the created user
        self.assertEqual(User.objects.get().username, 'newuser1')

    def test_register_existing_user(self):
        # Create a user with the same username or email to simulate an existing user
        User.objects.create_user(
            username='newuser1', email='newuser1@example.com', password='newpassword')

        # Ensure the user is created
        self.assertTrue(User.objects.filter(username='newuser1').exists())
        self.assertTrue(User.objects.filter(email='newuser1@example.com').exists())

        # Attempt to register the user again
        response = self.client.post(
            self.register_url, self.valid_user_data, format='json')

        # Verify the response status code
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Check for validation error messages
        self.assertIn('username', response.data)
        self.assertIn('email', response.data)

        # Ensure the error messages indicate the user already exists
        self.assertEqual(response.data['username'][0], 'user with this username already exists.')
        self.assertEqual(response.data['email'][0], 'user with this email address already exists.')

    def test_register_missing_data(self):
        # Test registration with missing required fields (username, email, password)
        response = self.client.post(self.register_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Check for validation error messages
        self.assertIn('username', response.data)
        self.assertIn('email', response.data)
        self.assertIn('password', response.data)

        # Ensure the error messages indicate the required fields
        self.assertEqual(response.data['username'][0], 'This field is required.')
        self.assertEqual(response.data['email'][0], 'This field is required.')
        self.assertEqual(response.data['password'][0], 'This field is required.')
