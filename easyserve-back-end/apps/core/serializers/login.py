from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from utils.authentication import RESTAURANT_DISABLED_MESSAGE, works_for_disabled_restaurant

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # You can also add custom claims inside the token itself if needed
        token['user_type'] = cls.get_user_type(user)
        return token

    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            # Right password but the restaurant is disabled: say so instead
            # of the generic "no active account" message.
            if self.user and works_for_disabled_restaurant(self.user):
                raise AuthenticationFailed(RESTAURANT_DISABLED_MESSAGE, code="restaurant_disabled")
            raise
        user = self.user

        # Add user type in response
        data['user_type'] = self.get_user_type(user)
        return data

    @staticmethod
    def get_user_type(user):
        return user.user_type
