from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # You can also add custom claims inside the token itself if needed
        token['user_type'] = cls.get_user_type(user)
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Add user type in response
        data['user_type'] = self.get_user_type(user)
        return data

    @staticmethod
    def get_user_type(user):
        return user.user_type
