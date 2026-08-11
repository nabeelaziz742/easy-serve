from apps.restaurants.constants import OrderStatus
from apps.dashboard.repositories import OrdersRepository


class OrderService:
    @staticmethod
    def change_status(order, label):
        value = OrderStatus.get(label)

        if value is None:
            raise ValueError(f"Invalid status '{label}'")

        return OrdersRepository.update_status(order, value)
