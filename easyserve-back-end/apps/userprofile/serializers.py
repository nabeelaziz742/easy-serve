from django.db import transaction, IntegrityError
from rest_framework import serializers
from .models import UserProfile, User, Notification
from ..restaurants.models import Restaurant


class RestaurantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = ['id', 'name', 'description', 'address', 'phone_number', 'email']

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    user_type = serializers.CharField(source='user.user_type', read_only=True)
    image = serializers.ImageField(read_only=True, required=False)
    restaurant = serializers.SerializerMethodField()
    owned_restaurants = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return request.build_absolute_uri("/media/profiles/default_profile.png")

    def get_restaurant(self, obj):
        if obj.user.user_type == 'waiter' and obj.restaurant:
            return RestaurantSerializer(obj.restaurant).data
        return None

    def get_owned_restaurants(self, obj):
        if obj.user.user_type == 'restaurant_owner':
            return RestaurantSerializer(obj.owned_restaurants.all(), many=True).data
        return []

class UserProfileWriteSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email")
    username = serializers.CharField(source="user.username")
    password = serializers.CharField(source="user.password", write_only=True, required=False)
    user_type = serializers.ChoiceField(source="user.user_type", choices=User._meta.get_field("user_type").choices)
    image = serializers.ImageField(write_only=True, required=False)

    restaurant = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.all(),
        required=False,
        allow_null=True
    )
    owned_restaurants = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Restaurant.objects.all(),
        required=False
    )

    class Meta:
        model = UserProfile
        fields = [
            "id", "first_name", "last_name", "phone", "bio", "image",
            "email", "username", "password", "user_type",
            'restaurant', 'owned_restaurants', 'selected_restaurant',
        ]

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        password = user_data.pop("password", None)
        owned_restaurants = validated_data.pop('owned_restaurants', [])
        restaurant = validated_data.pop('restaurant', None)
        image = validated_data.pop('image', None)

        # Create user
        try:
            with transaction.atomic():
                user = User.objects.create(**user_data)
                if password:
                    user.set_password(password)
                user.is_active = True
                if user.user_type in ['waiter', 'restaurant_owner'] :
                    user.is_staff = True
                user.save()

                profile = UserProfile.objects.create(user=user, **validated_data)

                if user.user_type == 'waiter' and restaurant:
                    profile.restaurant = restaurant
                    profile.owned_restaurants.clear()
                elif user.user_type == 'restaurant_owner':
                    profile.owned_restaurants.set(owned_restaurants or [])
                    profile.restaurant = None
                else:
                    profile.restaurant = None
                    profile.owned_restaurants.clear()

                if image:
                    profile.image = image

                profile.save()
                return profile

        except IntegrityError as e:
            if 'core_user.email' in str(e):
                raise serializers.ValidationError({"email": "A user with that email already exists."})
            elif 'core_user.username' in str(e):
                raise serializers.ValidationError({"username": "A user with that username already exists."})
            raise serializers.ValidationError({"error": str(e)})

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        password = user_data.pop("password", None)
        owned_restaurants = validated_data.pop("owned_restaurants", None)
        restaurant = validated_data.pop("restaurant", None)
        image = validated_data.pop("image", None)

        # Update User fields
        for attr, value in user_data.items():
            setattr(instance.user, attr, value)
        if password:
            instance.user.set_password(password)
        instance.user.save()

        # Update Profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update restaurant for waiter
        if instance.user.user_type == 'waiter' and restaurant:
            instance.restaurant = restaurant
            instance.owned_restaurants.clear()
        elif instance.user.user_type == 'restaurant_owner':
            instance.owned_restaurants.set(owned_restaurants or [])
            instance.restaurant = None
        else:
            instance.restaurant = None
            instance.owned_restaurants.clear()

        if image:
            instance.image = image

        instance.save()
        return instance

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'read', 'created_at']

    def update(self, instance, validated_data):
        read = validated_data.pop('read', None)
        if read:
            instance.read = read
            instance.save()

        return instance

class SelectedRestaurantSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['selected_restaurant']
        read_only_fields = []
