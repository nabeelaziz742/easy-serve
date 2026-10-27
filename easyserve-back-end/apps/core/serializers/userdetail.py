from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.userprofile.serializers import UserProfileSerializer

User = get_user_model()


class UserDetailSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    # Contact details the user edits on their profile page. They live on the
    # profile, so they are written there; the nested profile above is
    # read-only and used to silently drop them.
    first_name = serializers.CharField(max_length=255, required=False, write_only=True)
    last_name = serializers.CharField(max_length=255, required=False, write_only=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, write_only=True)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email',  'user_type', 'profile', 'first_name', 'last_name', 'phone', 'address']
        # The role decides every permission check. It was writable here, so
        # any user could PATCH /api/user/me/ to become a super_admin. Roles
        # are set by staff management and the admin only.
        read_only_fields = ['user_type']

    PROFILE_FIELDS = ('first_name', 'last_name', 'phone', 'address')

    def update(self, instance, validated_data):
        profile_data = {key: validated_data.pop(key) for key in self.PROFILE_FIELDS if key in validated_data}
        instance = super().update(instance, validated_data)
        profile = getattr(instance, 'profile', None)
        if profile is not None and profile_data:
            for key, value in profile_data.items():
                setattr(profile, key, value.strip())
            profile.save(update_fields=[*profile_data.keys(), 'updated_at'])
        return instance
