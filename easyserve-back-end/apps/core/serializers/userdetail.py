from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.userprofile.serializers import UserProfileSerializer

User = get_user_model()


class UserDetailSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['username', 'email',  'user_type', 'profile']
        # The role decides every permission check. It was writable here, so
        # any user could PATCH /api/user/me/ to become a super_admin. Roles
        # are set by staff management and the admin only.
        read_only_fields = ['user_type']
