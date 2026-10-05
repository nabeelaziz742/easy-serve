from django.db import models


class ExpensePaymentMethod(models.IntegerChoices):
    CASH = 1, "Cash"
    CARD = 2, "Credit / Debit Card"
    BANK_TRANSFER = 3, "Bank Transfer"
    ONLINE = 4, "Online / Digital Wallet"
    OTHER = 5, "Other"

    @classmethod
    def model_choices(cls):
        return cls.choices


class ExpenseStatus(models.IntegerChoices):
    ACTIVE = 1, "Active"
    VOIDED = 2, "Voided"

    @classmethod
    def model_choices(cls):
        return cls.choices
