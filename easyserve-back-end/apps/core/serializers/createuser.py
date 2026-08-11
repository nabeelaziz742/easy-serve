from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.userprofile.serializers import UserProfileSerializer


User = get_user_model()


class CreateUserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'profile', 'is_active', 'user_type']
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
