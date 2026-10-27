from django.urls import path
from . import views

app_name = "purchasing"
urlpatterns = [
    path("suppliers/", views.suppliers_view, name="suppliers"),
    path("suppliers/<int:supplier_id>/", views.supplier_detail_view, name="supplier-detail"),
    path("orders/", views.purchase_orders_view, name="orders"),
    path("orders/<int:order_id>/lines/", views.add_purchase_order_line_view, name="order-lines"),
    path("orders/<int:order_id>/<str:action>/", views.purchase_order_action_view, name="order-action"),
]
