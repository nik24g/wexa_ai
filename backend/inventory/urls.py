from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DashboardView, OrgSettingsView, ProductViewSet

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("settings/", OrgSettingsView.as_view(), name="settings"),
    path("", include(router.urls)),
]
