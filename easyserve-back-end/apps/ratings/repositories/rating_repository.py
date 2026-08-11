from apps.ratings.models import RestaurantRating, MenuItemRating

class RatingRepository:

    @staticmethod
    def get_restaurant_rating(user, restaurant_id):
        return RestaurantRating.objects.filter(user=user, restaurant_id=restaurant_id).first()

    @staticmethod
    def save_restaurant_rating(**data):
        return RestaurantRating.objects.update_or_create(
            user=data["user"],
            restaurant_id=data["restaurant_id"],
            defaults=data
        )

    @staticmethod
    def save_menu_item_rating(**data):
        return MenuItemRating.objects.update_or_create(
            user=data["user"],
            menu_item_id=data["menu_item_id"],
            defaults=data
        )

    @staticmethod
    def get_menu_item_rating(user, item_id):
        return MenuItemRating.objects.filter(user=user, menu_item_id=item_id).first()
