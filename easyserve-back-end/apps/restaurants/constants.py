from django.db import models


class PaymentStatus(models.IntegerChoices):
    PENDING = 1, "Pending"
    CONFIRMED = 2, "Confirmed"
    CANCELLED = 3, "Cancelled"

    @classmethod
    def model_choices(cls):
        return cls.choices


class OrderStatus(models.IntegerChoices):
    TO_PREPARE = 1, "To Prepare"
    PREPARING = 2, "Preparing"
    PREPARED = 3, "Prepared"
    SERVED = 4, "Served"

    @classmethod
    def model_choices(cls):
        return cls.choices


class OrderType(models.IntegerChoices):
    DINE_IN = 1, "Dine In"
    TAKEAWAY = 2, "Takeaway"
    DELIVERY = 3, "Delivery"

    @classmethod
    def model_choices(cls):
        return cls.choices


class DineInSessionStatus(models.IntegerChoices):
    ACTIVE = 1, "Active"
    CLOSED = 2, "Closed"

    @classmethod
    def model_choices(cls):
        return cls.choices


class PaymentMethod(models.IntegerChoices):
    CATCH_ON_DELIVERY = 1, "cash on delivery"
    TRANSFER = 2, "Transfer"

    @classmethod
    def model_choices(cls):
        return cls.choices


class ReviewBy(models.IntegerChoices):
    CUSTOMER = 1, "Customer"
    WAITER = 2, "Waiter"

    @classmethod
    def model_choices(cls):
        return cls.choices


class ReservationStatus(models.IntegerChoices):
    PENDING = 1, "Pending"
    CONFIRMED = 2, "Confirmed"
    SEATED = 3, "Seated"
    CANCELLED = 4, "Cancelled"
    COMPLETED = 5, "Completed"
    NO_SHOW = 6, "No Show"

    @classmethod
    def model_choices(cls):
        return cls.choices


class TableState(models.IntegerChoices):
    EMPTY = 1, "Empty"                      # No customers, clean
    RESERVED = 2, "Reserved"                # Booked but not yet seated
    OCCUPIED = 3, "Occupied"                # Customers seated
    ORDER_PLACED = 4, "Order Placed"        # Order taken but not yet preparing
    PREPARING = 5, "Preparing Order"        # Kitchen cooking
    READY = 6, "Ready to Serve"             # Food ready for service
    SERVED = 7, "Served"                    # Food delivered
    PAYMENT_PENDING = 8, "Awaiting Payment" # Customer finished meal
    CLEANING = 9, "Cleaning"                # Table dirty, being cleaned
    UNAVAILABLE = 10, "Unavailable"         # Broken / maintenance

    @classmethod
    def model_choices(cls):
        return cls.choices
