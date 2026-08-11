from django.contrib import admin
from django.urls import path, include

from django.conf.urls.static import static
from django.conf import settings

from rest_framework import permissions

from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

# ==================================================
# SWAGGER CONFIG
# ==================================================

schema_view = get_schema_view(
    openapi.Info(
        title="Easy Serve API",
        default_version="v1",
        description="Easy Serve Backend APIs",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(
            email="support@easyserve.com"
        ),
        license=openapi.License(
            name="BSD License"
        ),
    ),
    public=True,
    permission_classes=[
        permissions.AllowAny,
    ],
)

# ==================================================
# URLS
# ==================================================

urlpatterns = [

    # ==============================================
    # ADMIN
    # ==============================================

    path(
        "api/admin/",
        admin.site.urls
    ),

    # ==============================================
    # USER
    # ==============================================

    path(
        "api/user/",
        include("apps.core.urls")
    ),

    path(
        "api/user-profile/",
        include("apps.userprofile.urls")
    ),

    # ==============================================
    # RESTAURANTS
    # ==============================================

    path(
        "api/restaurants/",
        include("apps.restaurants.urls")
    ),

    # ==============================================
    # OWNER
    # ==============================================

    path(
        "api/owner-menus/",
        include("apps.owner.urls.menus")
    ),

    path(
        "api/owner-category/",
        include("apps.owner.urls.category")
    ),

    path(
        "api/owner-menu-items/",
        include("apps.owner.urls.menu_items")
    ),

    path(
        "api/owner-menu-item-ingredients/",
        include(
            "apps.owner.urls.menu_item_ingredients"
        )
    ),

    # ==============================================
    # SUPER ADMIN
    # ==============================================

    path(
        "api/superadmin/",
        include("apps.super_admin.urls")
    ),

    # ==============================================
    # DASHBOARD
    # ==============================================

    path(
        "api/dashboard/",
        include("apps.dashboard.urls")
    ),

    # ==============================================
    # RATINGS
    # ==============================================

    path(
        "api/ratings/",
        include("apps.ratings.urls")
    ),

    # ==============================================
    # RECOMMENDATION
    # ==============================================

    path(
        "api/recommend/",
        include("apps.recommendation.urls")
    ),

    # ==============================================
    # DRF AUTH
    # ==============================================

    path(
        "api/api-auth/",
        include("rest_framework.urls")
    ),

    # ==============================================
    # DRF SPECTACULAR
    # ==============================================

    path(
        "api/schema/",
        SpectacularAPIView.as_view(),
        name="schema",
    ),

    path(
    "swagger/",
    SpectacularSwaggerView.as_view(
        url_name="schema",
        template_name="drf_spectacular/swagger_ui.html",
    ),
    name="swagger-ui",
    ),

    # ==============================================
    # DRF YASG
    # ==============================================

    path(
        "swagger-json/",
        schema_view.without_ui(
            cache_timeout=0
        ),
        name="schema-json",
    ),

    path(
        "redoc/",
        schema_view.with_ui(
            "redoc",
            cache_timeout=0
        ),
        name="schema-redoc",
    ),

]

# ==================================================
# STATIC / MEDIA
# ==================================================

urlpatterns += static(
    settings.STATIC_URL,
    document_root=settings.STATIC_ROOT
)

urlpatterns += static(
    settings.MEDIA_URL,
    document_root=settings.MEDIA_ROOT
)