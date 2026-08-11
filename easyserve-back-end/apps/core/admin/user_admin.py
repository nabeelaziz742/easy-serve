from django.contrib import admin
from apps.core.models import (
    User,
    CompanyInfo,
    UserActivation,
    ForgetPassword,
)


@admin.register(ForgetPassword)
class ForgetPasswordAdmin(admin.ModelAdmin):
    pass


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'username', 'user_type', 'is_staff', 'is_active')
    list_display_links = ('id', 'email', 'username', 'user_type')
    search_fields = ('email', 'username')
    list_filter = ('is_staff', 'is_active')
    list_per_page = 25


@admin.register(UserActivation)
class UserActivationAdmin(admin.ModelAdmin):
    pass


@admin.register(CompanyInfo)
class CompanyInfoAdmin(admin.ModelAdmin):
    pass
