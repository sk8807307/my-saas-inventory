from django.urls import path
from . import views

app_name = "sales"
urlpatterns = [
    path("customers/", views.customers_view, name="customers"),
    path("customers/<int:customer_id>/", views.customer_detail_view, name="customer-detail"),
    path("orders/", views.orders_view, name="orders"),
    path("orders/<int:order_id>/lines/", views.add_order_line_view, name="order-lines"),
    path("orders/<int:order_id>/payments/", views.record_payment_view, name="record-payment"),
    path("orders/<int:order_id>/<str:action>/", views.order_action_view, name="order-action"),
]
