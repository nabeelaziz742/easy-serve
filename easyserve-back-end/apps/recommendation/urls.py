from django.urls import path
from .views import RecommendMenuItemAPIView, RecommendUserBaseMenuItemAPIView

urlpatterns = [
    path("menu-item/<int:item_id>/", RecommendMenuItemAPIView.as_view()),

    path("user-menu-item", RecommendUserBaseMenuItemAPIView.as_view()),
]
