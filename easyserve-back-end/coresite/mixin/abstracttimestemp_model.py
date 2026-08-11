from django.db import models


class AbstractTimeStampModel(models.Model):
    """
    Abstract model to add created_at and updated_at fields to every model.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class AbstractCreateTimeStampModel(models.Model):
    """
    Abstract model to add created_at and updated_at fields to every model.
    """
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
