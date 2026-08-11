from django.contrib import admin
from .models import UserProfile, Notification


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'image', 'created_at', 'updated_at')
    list_filter = ('user', 'first_name', 'last_name', 'image', 'created_at', 'updated_at',)
    search_fields = ('user', 'first_name', 'last_name', 'image', 'created_at', 'updated_at')
    list_per_page = 25

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('profile', 'message', 'read')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('read', 'message')
    list_per_page = 25
