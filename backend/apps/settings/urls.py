from django.urls import path
from . import views

app_name = "settings"
urlpatterns = [path("organization/", views.organization_settings_view, name="organization")]
