from django.contrib import admin

from .models import (
    Location,
    Product,
    ProductUnit,
    StockBalance,
    StockMovement,
    UnitOfMeasure,
    Warehouse,
    WarehouseReorderPoint,
)


@admin.register(UnitOfMeasure)
class UnitOfMeasureAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "tenant", "is_active")
    list_filter = ("tenant", "is_active")
    search_fields = ("code", "name", "tenant__name")


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "tenant", "is_active")
    list_filter = ("tenant", "is_active")
    search_fields = ("code", "name", "tenant__name")


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "warehouse", "tenant_name")
    list_filter = ("warehouse__tenant", "warehouse")
    search_fields = ("code", "name", "warehouse__name", "warehouse__tenant__name")

    @admin.display(description="Tenant", ordering="warehouse__tenant__name")
    def tenant_name(self, obj):
        return obj.warehouse.tenant.name


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "tenant", "base_uom", "reorder_point", "is_active")
    list_filter = ("tenant", "base_uom", "is_active")
    search_fields = ("sku", "name", "description", "tenant__name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ProductUnit)
class ProductUnitAdmin(admin.ModelAdmin):
    list_display = ("product", "unit", "factor")
    list_filter = ("product__tenant", "unit")
    search_fields = ("product__sku", "product__name", "unit__code")


@admin.register(StockBalance)
class StockBalanceAdmin(admin.ModelAdmin):
    list_display = ("product", "location", "warehouse_name", "on_hand", "reserved", "available")
    list_filter = ("product__tenant", "location__warehouse")
    search_fields = ("product__sku", "product__name", "location__code", "location__warehouse__name")

    @admin.display(description="Warehouse", ordering="location__warehouse__name")
    def warehouse_name(self, obj):
        return obj.location.warehouse.name

    @admin.display(description="Available")
    def available(self, obj):
        return obj.available


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("created_at", "product", "location", "kind", "quantity_change", "created_by")
    list_filter = ("kind", "location__warehouse__tenant", "created_at")
    search_fields = ("product__sku", "product__name", "note", "created_by__email")
    readonly_fields = ("product", "location", "quantity_change", "kind", "note", "created_by", "created_at")

    # Stock movements are audit records; inspect them here but change stock through StockBalance.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(WarehouseReorderPoint)
class WarehouseReorderPointAdmin(admin.ModelAdmin):
    list_display = ("product", "warehouse", "quantity")
    list_filter = ("product__tenant", "warehouse")
    search_fields = ("product__sku", "product__name", "warehouse__name", "warehouse__code")
