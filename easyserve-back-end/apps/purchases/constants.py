from django.db import models


class PurchaseStatus(models.IntegerChoices):
    DRAFT = 1, "Draft"
    RECEIVED = 2, "Received"
    CANCELLED = 3, "Cancelled"

    @classmethod
    def model_choices(cls):
        return cls.choices
