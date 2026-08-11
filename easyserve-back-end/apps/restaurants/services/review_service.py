from django.db.models import Avg

def update_restaurant_rating(restaurant):
    restaurant.avg_rating = restaurant.menu_items.aggregate(avg=Avg("reviews__rate"))["avg"] or 0
    restaurant.total_reviews = restaurant.menu_items.filter(reviews__isnull=False).count()
    restaurant.save()

def update_menu_item_rating(menu_item):
    menu_item.avg_rating = menu_item.aggregate(avg=Avg("reviews__rate"))["avg"] or 0
    menu_item.total_reviews = menu_item.filter(reviews__isnull=False).count()
    menu_item.save()
