from rest_framework import serializers
from apps.ratings.models import RestaurantRating


class RestaurantRatingSerializer(serializers.Serializer):
    restaurant_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    review = serializers.CharField(required=False)

class MenuItemRatingSerializer(serializers.Serializer):
    menu_item_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    review = serializers.CharField(required=False)

class RestaurantReviewSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    date = serializers.DateField(source='created_at', format="%Y-%m-%d")

    class Meta:
        model = RestaurantRating
        fields = ['id', 'name', 'rating', 'review', 'date']

    def get_name(self, obj):
        profile = obj.user
        full_name = getattr(profile, 'full_name', None) or getattr(profile, 'name', None)
        if full_name:
            return full_name
        user = getattr(profile, 'user', None)
        return getattr(user, 'username', 'Anonymous') if user else 'Anonymous'