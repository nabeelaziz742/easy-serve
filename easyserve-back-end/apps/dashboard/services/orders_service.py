from apps.restaurants.constants import OrderStatus
from apps.dashboard.repositories import OrdersRepository


class OrderService:
    @staticmethod
    def change_status(order, label):
        try:
            value = OrderStatus(label)
        except ValueError:
            raise ValueError(f"Invalid status '{label}'")

        return OrdersRepository.update_status(order, value)