# apps/authentication/urls.py
from django.urls import path

from . import views

app_name = "authentication"

urlpatterns = [
    path("csrf/", views.csrf_token_view, name="csrf-token"),
    path("register/", views.register_view, name="register"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("me/", views.current_user_view, name="current-user"),
    path("memberships/", views.memberships_view, name="memberships"),
    path("tenant/select/", views.select_tenant_view, name="select-tenant"),
    path(
        "password-reset/",
        views.password_reset_request_view,
        name="password-reset-request",
    ),
    path(
        "password-reset/confirm/",
        views.password_reset_confirm_view,
        name="password-reset-confirm",
    ),
]

