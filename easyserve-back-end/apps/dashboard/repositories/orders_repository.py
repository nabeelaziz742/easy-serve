from apps.restaurants.models import Orders


class OrdersRepository:
    @staticmethod
    def get_order(pk):
        return Orders.objects.filter(pk=pk).first()

    @staticmethod
    def update_status(order, value):
        order.order_status = value
        order.save()
        return order
