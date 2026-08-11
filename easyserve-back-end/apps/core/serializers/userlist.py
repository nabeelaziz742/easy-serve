from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.userprofile.models import UserProfile

User = get_user_model()


class UserListSerializer(serializers.ModelSerializer):
    phone = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'user_type', 'is_active', 'first_name', 'last_name', 'phone']

    def get_phone(self, obj):
        return getattr(getattr(obj, 'profile', None), 'phone', '') or ''

    def get_first_name(self, obj):
        return getattr(getattr(obj, 'profile', None), 'first_name', '') or ''

    def get_last_name(self, obj):
        return getattr(getattr(obj, 'profile', None), 'last_name', '') or ''


class StaffUpdateSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(required=False, allow_blank=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'first_name', 'last_name', 'phone']

    def update(self, instance, validated_data):
        phone = validated_data.pop('phone', None)
        first_name = validated_data.pop('first_name', None)
        last_name = validated_data.pop('last_name', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if phone is not None:
            profile.phone = phone
        if first_name is not None:
            profile.first_name = first_name
        if last_name is not None:
            profile.last_name = last_name
        profile.save()

        return instance