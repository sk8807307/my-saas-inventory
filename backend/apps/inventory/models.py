from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Lower

from apps.authentication.models import Tenant, User


class UnitOfMeasure(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="units")
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=80)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]
        constraints = [
            models.UniqueConstraint(Lower("code"), "tenant", name="inventory_uom_tenant_ci_unique")
        ]

    def __str__(self):
        return self.code


class Warehouse(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="warehouses")
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=30)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(Lower("code"), "tenant", name="inventory_warehouse_tenant_code_ci")
        ]

    def __str__(self):
        return self.name


class Location(models.Model):
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="locations")
    code = models.CharField(max_length=40)
    name = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["warehouse__name", "code"]
        constraints = [
            models.UniqueConstraint(Lower("code"), "warehouse", name="inventory_location_warehouse_code_ci")
        ]

    def __str__(self):
        return f"{self.warehouse.code}/{self.code}"


class Product(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="products")
    sku = models.CharField(max_length=80)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    base_uom = models.ForeignKey(UnitOfMeasure, on_delete=models.PROTECT, related_name="products")
    reorder_point = models.DecimalField(max_digits=14, decimal_places=3, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(Lower("sku"), "tenant", name="inventory_product_tenant_sku_ci")
        ]

    def save(self, *args, **kwargs):
        self.sku = self.sku.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sku} — {self.name}"


class ProductUnit(models.Model):
    """A purchase or sales package measured as a multiple of the base unit."""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="units")
    unit = models.ForeignKey(UnitOfMeasure, on_delete=models.PROTECT)
    factor = models.DecimalField(max_digits=14, decimal_places=4)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["product", "unit"], name="inventory_product_unit_unique"),
            models.CheckConstraint(condition=Q(factor__gt=0), name="inventory_product_unit_factor_positive"),
        ]


class StockBalance(models.Model):
    """Current quantities in the item's immutable base unit at one bin."""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="stock_balances")
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="stock_balances")
    on_hand = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    reserved = models.DecimalField(max_digits=14, decimal_places=3, default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["product", "location"], name="inventory_balance_product_location_unique"),
            models.CheckConstraint(condition=Q(on_hand__gte=0), name="inventory_balance_on_hand_nonnegative"),
            models.CheckConstraint(condition=Q(reserved__gte=0) & Q(reserved__lte=F("on_hand")), name="inventory_balance_reservation_valid"),
        ]

    @property
    def available(self):
        return self.on_hand - self.reserved


class StockMovement(models.Model):
    class Kind(models.TextChoices):
        ADJUSTMENT = "adjustment", "Adjustment"
        RECEIPT = "receipt", "Receipt"
        SHIPMENT = "shipment", "Shipment"

    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="movements")
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="movements")
    quantity_change = models.DecimalField(max_digits=14, decimal_places=3)
    kind = models.CharField(max_length=16, choices=Kind.choices)
    note = models.CharField(max_length=250, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class WarehouseReorderPoint(models.Model):
    """Warehouse threshold; fall back to the product threshold when missing."""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="warehouse_reorder_points")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="reorder_points")
    quantity = models.DecimalField(max_digits=14, decimal_places=3)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["product", "warehouse"], name="inventory_product_warehouse_reorder_unique"),
            models.CheckConstraint(condition=Q(quantity__gte=0), name="inventory_reorder_quantity_nonnegative"),
        ]
