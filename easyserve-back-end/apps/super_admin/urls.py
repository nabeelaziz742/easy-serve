from django.urls import path
from .views import OverviewMetricsAPIView

urlpatterns = [
    path('overview/', OverviewMetricsAPIView.as_view(), name='superadmin-overview'),
]
