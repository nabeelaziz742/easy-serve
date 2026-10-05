from django.db import models


class StockMovementType(models.IntegerChoices):
    ADJUSTMENT = 1, "Adjustment"
    PURCHASE_IN = 2, "Purchase In"
    ORDER_CONSUMPTION = 3, "Order Consumption"
    WASTAGE = 4, "Wastage"
    PURCHASE_RETURN = 5, "Purchase Return"

    @classmethod
    def model_choices(cls):
        return cls.choices


class StockAdjustmentReason(models.IntegerChoices):
    OPENING_STOCK = 1, "Opening Stock Initial Count"
    PHYSICAL_AUDIT = 2, "Physical Stock Count / Audit"
    DAMAGE = 3, "Damaged in Handling"
    EXPIRY = 4, "Expired / Discarded"
    CORRECTION = 5, "Data Correction"
    CORRECTION_IN = 6, "Stock Correction (Increase)"
    CORRECTION_OUT = 7, "Stock Correction (Decrease)"
    OTHER = 8, "Other Operational Adjustment"

    @classmethod
    def model_choices(cls):
        return cls.choices


class WastageReason(models.IntegerChoices):
    EXPIRED = 1, "Expired Stock"
    SPOILED = 2, "Spoiled / Rotten"
    DAMAGED = 3, "Damaged in Handling"
    PREPARATION_LOSS = 4, "Preparation Loss / Trimming"
    OVERPRODUCTION = 5, "Overproduction / Unsold Prepared"
    SPILLAGE = 6, "Spillage / Dropped"
    THEFT_LOSS = 7, "Theft / Unaccounted Loss"
    QUALITY_ISSUE = 8, "Quality Issue / Rejected"
    OTHER = 9, "Other Operational Loss"

    @classmethod
    def model_choices(cls):
        return cls.choices
