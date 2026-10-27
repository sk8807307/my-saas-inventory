from django.urls import path

from . import views

app_name = "inventory"
urlpatterns = [
    path("units/", views.units_view, name="units"),
    path("warehouses/", views.warehouses_view, name="warehouses"),
    path("locations/", views.locations_view, name="locations"),
    path("products/", views.products_view, name="products"),
    path(
        "products/<int:product_id>/units/",
        views.product_units_view,
        name="product-units",
    ),
    path("reorder-points/", views.reorder_points_view, name="reorder-points"),
    path("low-stock/", views.low_stock_view, name="low-stock"),
    path("stock/", views.stock_balances_view, name="stock-balances"),
    path("stock/adjustments/", views.stock_adjustment_view, name="stock-adjustment"),
]
