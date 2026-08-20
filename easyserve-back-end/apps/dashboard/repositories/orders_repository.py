from apps.restaurants.models import Orders


class OrdersRepository:
    @staticmethod
    def get_order(pk):
        return Orders.objects.filter(pk=pk).first()

    @staticmethod
    def get_order_restaurant_id(order):
        """Resolve the restaurant an order belongs to, whether it came in
        via a table (dine-in walk-up) or a dine-in QR session."""
        if order.table_id and order.table.restaurant_id:
            return order.table.restaurant_id
        if order.dine_in_session_id and order.dine_in_session.restaurant_id:
            return order.dine_in_session.restaurant_id
        return None

    @staticmethod
    def user_can_access_restaurant(profile, restaurant_id):
        """A user can access an order's restaurant if they're staff
        assigned to it (profile.restaurant) or an owner of it
        (profile.owned_restaurants)."""
        if restaurant_id is None:
            return False
        if profile.restaurant_id == restaurant_id:
            return True
        return profile.owned_restaurants.filter(id=restaurant_id).exists()

    @staticmethod
    def update_status(order, value):
        order.order_status = value
        order.save()
        return order
