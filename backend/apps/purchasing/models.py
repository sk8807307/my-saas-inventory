from django.db import models
from django.db.models import Q

from apps.authentication.models import Tenant
from apps.inventory.models import Location, Product, UnitOfMeasure


class Supplier(models.Model):
    class Status(models.TextChoices):
        ONBOARDING = "onboarding", "Onboarding"
        ACTIVE = "active", "Active"
        ON_HOLD = "on_hold", "On hold"
        DEACTIVATED = "deactivated", "Deactivated"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="suppliers")
    name = models.CharField(max_length=160)
    primary_contact = models.CharField(max_length=160, blank=True)
    lead_time_days = models.PositiveSmallIntegerField(default=0)
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ONBOARDING)
    bank_details = models.TextField(blank=True)
    tax_id = models.CharField(max_length=80, blank=True)
    payment_terms = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return self.name


class PurchaseOrder(models.Model):
    class ApprovalStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending_approval", "Pending approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class ReceivingStatus(models.TextChoices):
        UNRECEIVED = "unreceived", "Unreceived"
        PARTIAL = "partially_received", "Partially received"
        RECEIVED = "received", "Received"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="purchase_orders")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="purchase_orders")
    number = models.CharField(max_length=40)
    approval_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.DRAFT)
    receiving_status = models.CharField(max_length=20, choices=ReceivingStatus.choices, default=ReceivingStatus.UNRECEIVED)
    expected_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [models.UniqueConstraint(fields=["tenant", "number"], name="purchasing_order_tenant_number_unique")]

    @property
    def delivery_health(self):
        """Late receipts remain allowed; this value is only an operational flag."""
        from django.utils import timezone

        if self.receiving_status == self.ReceivingStatus.RECEIVED or not self.expected_date:
            return "on_time"
        if self.expected_date < timezone.localdate():
            return "overdue"
        if (self.expected_date - timezone.localdate()).days <= 3:
            return "due_soon"
        return "on_track"


class PurchaseOrderLine(models.Model):
    order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="lines")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="purchase_lines")
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="purchase_lines")
    # A null unit means the product's base unit. The factor is saved as a snapshot.
    unit = models.ForeignKey(UnitOfMeasure, null=True, blank=True, on_delete=models.PROTECT)
    unit_factor = models.DecimalField(max_digits=14, decimal_places=4, default=1)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    received_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    unit_cost_minor = models.PositiveBigIntegerField(default=0)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="purchasing_line_quantity_positive"),
            models.CheckConstraint(condition=Q(received_quantity__gte=0), name="purchasing_line_received_nonnegative"),
        ]

    @property
    def base_quantity(self):
        return self.quantity * self.unit_factor
