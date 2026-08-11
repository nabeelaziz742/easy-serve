from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from .helper.get_access_token_helper import generate_access_token

User = get_user_model()


class UserDetailAPITestCase(TestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username="testuser",
            password="testpassword",
            email="testuser@example.com"
        )

        # Create a test client and authenticate the user
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.token = generate_access_token(self.user)

    def test_get_user_details(self):
        # Define the endpoint URL for retrieving user details
        url = reverse('user')

        # Send a GET request to retrieve user details
        response = self.client.get(
            url, format='json', HTTP_AUTHORIZATION='Bearer ' + self.token)

        # Check if the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check if the response data contains the expected user details
        self.assertEqual(response.data['username'], self.user.username)
        self.assertEqual(response.data['email'], self.user.email)

    def test_update_user_details(self):
        # Define the endpoint URL for updating user details
        url = reverse('user')

        # Data to be sent in the request to update user details
        updated_data = {
            'username': 'newusername',
            'email': 'newemail@example.com',
        }

        # Send a PUT request to update user details
        response = self.client.put(url, updated_data, format='json', )

        # Check if the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Refresh the user instance from the database
        self.user.refresh_from_db()

        # Check if the user details have been updated in the database
        self.assertEqual(self.user.username, updated_data['username'])
        self.assertEqual(self.user.email, updated_data['email'])

    def test_delete_user(self):
        # Define the endpoint URL for deleting a user
        url = reverse('user')

        # Send a DELETE request to delete the user
        response = self.client.delete(
            url, format='json', HTTP_AUTHORIZATION='Bearer ' + self.token)

        # Check if the response status code is 204 No Content (indicating success)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Check if the user has been deleted from the database
        self.assertFalse(User.objects.filter(id=self.user.id).exists())
