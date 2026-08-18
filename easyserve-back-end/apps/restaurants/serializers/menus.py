from rest_framework import serializers

from apps.restaurants.models import Menu, MenuItem, MenuItemIngredient, RestaurantImage, Restaurant
from apps.restaurants.serializers.category import CategoryLiteSerializer
from apps.userprofile.models import UserProfile


class UserProfileUserNameSerializer(serializers.ModelSerializer):
    """
    Serializer for UserProfile model with only username field.
    """
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'username']
        read_only_fields = ['id', 'username']

class RestaurantImageSerializer(serializers.ModelSerializer):
    """
    Serializer for RestaurantImage model.
    """
    class Meta:
        model = RestaurantImage
        fields = ['id', 'restaurant', 'image', 'is_primary']
        read_only_fields = ['id', 'restaurant']

class RestaurantSerializer(serializers.ModelSerializer):
    images = RestaurantImageSerializer(many=True, read_only=True)
    image = serializers.ImageField(write_only=True, required=False)
    owners = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=UserProfile.objects.all(),
        required=False
    )
    waiters = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=UserProfile.objects.all(),
        required=False
    )
    owners_detail = UserProfileUserNameSerializer(source="owners", many=True, read_only=True)
    waiters_detail = UserProfileUserNameSerializer(source="waiters", many=True, read_only=True)

    class Meta:
        model = Restaurant
        fields = [
            'id',
            'name',
            'description',
            'address',
            'phone_number',
            'email',
            'images',
            'image',
            'owners',
            'waiters',
            'owners_detail',
            'waiters_detail',
        ]
        read_only_fields = ['id', 'images']

    def create(self, validated_data):
        image = validated_data.pop('image', None)
        owners = validated_data.pop('owners', [])
        waiters = validated_data.pop('waiters', [])

        restaurant = super().create(validated_data)

        if owners:
            restaurant.owners.set(owners)
        if waiters:
            restaurant.waiters.set(waiters)
        if image:
            RestaurantImage.objects.create(
                restaurant=restaurant,
                image=image,
                is_primary=True
            )
        return restaurant

    def update(self, instance, validated_data):
        image = validated_data.pop('image', None)
        owners = validated_data.pop('owners', None)
        waiters = validated_data.pop('waiters', None)

        restaurant = super().update(instance, validated_data)

        if owners is not None:
            restaurant.owners.set(owners)
        else:
            instance.owners.clear()
        if waiters is not None:
            restaurant.waiters.set(waiters)
        else:
            instance.waiters.clear()
        if image:
            # replace primary image
            RestaurantImage.objects.filter(
                restaurant=restaurant,
                is_primary=True
            ).delete()
            RestaurantImage.objects.create(
                restaurant=restaurant,
                image=image,
                is_primary=True
            )

        instance.save()
        return instance

class TopRestaurantSerializer(serializers.ModelSerializer):

    class Meta:
        model = Restaurant
        fields = [
            'id',
            'name',
            'description',
            'address',
            'phone_number',
        ]
        read_only_fields = ['id']

class RestaurantLiteSerializer(serializers.ModelSerializer):
    """
    Lite serializer for Restaurant model.
    """
    class Meta:
        model = Restaurant
        fields = ['id', 'name']
        read_only_fields = ['id']

class RestaurantSerializerForMenu(serializers.ModelSerializer):
    """
    Lite serializer for Restaurant model.
    """
    class Meta:
        model = Restaurant
        fields = ['id', 'name', 'description', 'address', 'cuisine']
        read_only_fields = ['id']

class MenuItemIngredientSerializer(serializers.ModelSerializer):
    """
    Serializer for MenuItemIngredient model.
    """
    class Meta:
        model = MenuItemIngredient
        fields = ['id', 'name', 'image', 'quantity', 'description']
        read_only_fields = ['id']

class MenuItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'image', 'description', 'price', 'category']
        read_only_fields = ['id', 'menu']

    def create(self, validated_data):
        request = self.context.get('request')
        menu_id = request.query_params.get('menu_id')
        if menu_id:
            validated_data['menu_id'] = menu_id
        return super().create(validated_data)

class MenuItemDetailSerializer(serializers.ModelSerializer):
    ingredients = MenuItemIngredientSerializer(many=True, read_only=True)

    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'image', 'description', 'price', 'category', 'ingredients']
        read_only_fields = ['id', 'menu']

class FullMenuItemSerializer(serializers.ModelSerializer):
    ingredients = MenuItemIngredientSerializer(many=True, read_only=True)
    class Meta:
        model = MenuItem
        fields = ['id', 'menu', 'name', 'image', 'description', 'price', 'ingredients', 'category']
        read_only_fields = ['id']

class MenuItemIdOnlySerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ['id']
        read_only_fields = ['id']


class MenuSerializer(serializers.ModelSerializer):
    """
    Serializer for Menu model.
    """
    # Required for owner-menu creation; write-only keeps existing read responses unchanged.
    restaurant = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.all(),
        write_only=True,
    )
    menu_items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = Menu
        fields = ['id', 'restaurant', 'name', 'description', 'menu_items']
        read_only_fields = ['id']

class FullMenuSerializer(serializers.ModelSerializer):
    """
    Serializer for Full Menu Model
    """
    menu_items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = Menu
        fields = ['id', 'restaurant', 'name', 'description', 'menu_items',]
        read_only_fields = ['id']
