from django.db import models

from apps.authentication.models import Tenant
from apps.inventory.models import Location, Product, UnitOfMeasure


class Customer(models.Model):
    class AccountStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        ON_HOLD = "on_hold", "On hold"
        CLOSED = "closed", "Closed"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="customers")
    name = models.CharField(max_length=160)
    company = models.CharField(max_length=160, blank=True)
    contact = models.CharField(max_length=160, blank=True)
    account_status = models.CharField(max_length=16, choices=AccountStatus.choices, default=AccountStatus.ACTIVE)
    tax_id = models.CharField(max_length=80, blank=True)
    credit_limit_minor = models.PositiveBigIntegerField(default=0)
    billing_address = models.TextField(blank=True)
    shipping_address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return self.company or self.name


class SalesOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        CONFIRMED = "confirmed", "Confirmed"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentStatus(models.TextChoices):
        UNPAID = "unpaid", "Unpaid"
        PARTIAL = "partial", "Partial"
        PAID = "paid", "Paid"

    class FulfillmentStatus(models.TextChoices):
        UNFULFILLED = "unfulfilled", "Unfulfilled"
        PARTIAL = "partial", "Partial"
        SHIPPED = "shipped", "Shipped"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="sales_orders")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="orders")
    number = models.CharField(max_length=40)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    payment_status = models.CharField(max_length=16, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    fulfillment_status = models.CharField(max_length=16, choices=FulfillmentStatus.choices, default=FulfillmentStatus.UNFULFILLED)
    currency = models.CharField(max_length=3, default="USD")
    paid_minor = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [models.UniqueConstraint(fields=["tenant", "number"], name="sales_order_tenant_number_unique")]

    def __str__(self):
        return self.number


class SalesOrderLine(models.Model):
    order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name="lines")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="sales_lines")
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="sales_lines")
    # A null unit means the product's base unit. The factor is saved as a snapshot.
    unit = models.ForeignKey(UnitOfMeasure, null=True, blank=True, on_delete=models.PROTECT)
    unit_factor = models.DecimalField(max_digits=14, decimal_places=4, default=1)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price_minor = models.PositiveBigIntegerField()
    shipped_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(quantity__gt=0), name="sales_line_quantity_positive")]

    @property
    def base_quantity(self):
        return self.quantity * self.unit_factor
