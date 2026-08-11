from django.db import models
from coresite.mixin import AbstractTimeStampModel


class CompanyInfo(AbstractTimeStampModel):
    """ Company Info Model for emails templates"""
    company_logo = models.ImageField(upload_to='company_logo')
    company_name = models.CharField(max_length=255)
    company_address = models.CharField(max_length=255)
    company_email = models.EmailField(max_length=255)
    company_phone = models.CharField(max_length=255)
    company_website = models.CharField(max_length=255)
    company_facebook = models.CharField(max_length=255)
    company_twitter = models.CharField(max_length=255)
    company_instagram = models.CharField(max_length=255)
    company_text_color = models.CharField(
        max_length=255, default="#ffffff")
    company_primary_color = models.CharField(
        max_length=255, default="#ffffff")
    company_secondary_color = models.CharField(
        max_length=255, default="#ffffff")
    company_copyright = models.CharField(
        max_length=255, default="default")
    company_button_color = models.CharField(
        max_length=255, default="#ffffff")
    company_starting_year = models.CharField(max_length=255, default="2021")

    def __str__(self):
        return self.company_name
