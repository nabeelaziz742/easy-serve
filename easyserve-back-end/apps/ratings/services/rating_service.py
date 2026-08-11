from apps.ratings.repositories.rating_repository import RatingRepository

class RatingService:

    @staticmethod
    def rate_restaurant(user, restaurant_id, rating, review=None):
        return RatingRepository.save_restaurant_rating(
            user=user,
            restaurant_id=restaurant_id,
            rating=rating,
            review=review
        )

    @staticmethod
    def rate_menu_item(user, item_id, rating, review=None):
        return RatingRepository.save_menu_item_rating(
            user=user,
            menu_item_id=item_id,
            rating=rating,
            review=review
        )
