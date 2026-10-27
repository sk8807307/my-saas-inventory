"""Create repeatable pharmacy demo data for local development."""

from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.authentication.models import Membership, Tenant, User
from apps.inventory.models import (
    Location,
    Product,
    ProductUnit,
    StockBalance,
    StockMovement,
    UnitOfMeasure,
    Warehouse,
    WarehouseReorderPoint,
)
from apps.sales.models import Customer, SalesOrder
from apps.settings.models import OrganizationSettings


class Command(BaseCommand):
    help = "Seed an idempotent pharmacy demo workspace into a new tenant for user123@abc.com."

    @transaction.atomic
    def handle(self, *args, **options):
        # Explicit target configuration to avoid modifying Tenant 1
        email = "user123@abc.com"
        tenant_slug = "user123-pharmacy-demo"

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist as exc:
            raise CommandError(
                f"No user with email {email!r} exists. Create that user first, "
                "then rerun this command."
            ) from exc

        # Create or fetch a distinct tenant workspace for user123@abc.com
        tenant, tenant_created = Tenant.objects.get_or_create(
            slug=tenant_slug,
            defaults={"name": "User123 Retail Pharmacy"},
        )

        # Handle structural membership assignments
        owner_exists = Membership.objects.filter(
            tenant=tenant, role=Membership.Role.OWNER
        ).exists()
        Membership.objects.get_or_create(
            tenant=tenant,
            user=user,
            defaults={
                "role": Membership.Role.OWNER
                if not owner_exists
                else Membership.Role.MEMBER,
                "status": Membership.Status.ACTIVE,
                "activated_at": timezone.now(),
            },
        )

        units = {}
        for code, name in [
            ("TAB", "Tablet"),
            ("CAP", "Capsule"),
            ("PEN", "Insulin pen"),
            ("BOX", "Box"),
            ("VIAL", "Vial"),
            ("AMP", "Ampoule"),
            ("BTL", "Bottle"),
            ("TUBE", "Tube"),
        ]:
            units[code], _ = UnitOfMeasure.objects.get_or_create(
                tenant=tenant,
                code=code,
                defaults={"name": name},
            )

        main_warehouse, _ = Warehouse.objects.get_or_create(
            tenant=tenant,
            code="MAIN",
            defaults={"name": "Main Pharmacy"},
        )
        cold_warehouse, _ = Warehouse.objects.get_or_create(
            tenant=tenant,
            code="COLD",
            defaults={"name": "Cold Storage"},
        )
        locations = {}
        for warehouse, code, name in [
            (main_warehouse, "A-01", "General medicines"),
            (main_warehouse, "A-02", "Prescription medicines"),
            (cold_warehouse, "C-01", "Temperature controlled"),
        ]:
            locations[(warehouse.code, code)], _ = Location.objects.get_or_create(
                warehouse=warehouse,
                code=code,
                defaults={"name": name},
            )

        # Expanded matrix tracking exactly 20 distinct data records for testing
        product_specs = [
            (
                "PAR-500",
                "Paracetamol 500 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "100",
                "1500",
                "200",
                "A-01",
            ),
            (
                "AMX-250",
                "Amoxicillin 250 mg capsules",
                units["CAP"],
                "CAP",
                "BOX",
                "100",
                "800",
                "150",
                "A-02",
            ),
            (
                "VIT-C-100",
                "Vitamin C 100 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "30",
                "500",
                "50",
                "A-01",
            ),
            (
                "INS-GLAR",
                "Insulin glargine 100 units/ml pen",
                units["PEN"],
                "PEN",
                "BOX",
                "5",
                "120",
                "20",
                "C-01",
            ),
            (
                "IBU-400",
                "Ibuprofen 400 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "50",
                "2000",
                "300",
                "A-01",
            ),
            (
                "MET-500",
                "Metformin 500 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "100",
                "3500",
                "400",
                "A-01",
            ),
            (
                "AML-5",
                "Amlodipine 5 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "30",
                "1200",
                "100",
                "A-01",
            ),
            (
                "ATOR-20",
                "Atorvastatin 20 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "90",
                "1800",
                "150",
                "A-01",
            ),
            (
                "LOS-50",
                "Losartan 50 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "30",
                "900",
                "100",
                "A-01",
            ),
            (
                "ALB-90",
                "Albuterol HFA 90 mcg inhaler",
                units["BOX"],
                "BOX",
                "BOX",
                "1",
                "400",
                "60",
                "A-01",
            ),
            (
                "OMEP-20",
                "Omeprazole 20 mg capsules",
                units["CAP"],
                "CAP",
                "BOX",
                "28",
                "1600",
                "200",
                "A-01",
            ),
            (
                "AMO-CLAV",
                "Amoxicillin/Clavulanate 875/125 mg",
                units["TAB"],
                "TAB",
                "BOX",
                "20",
                "600",
                "80",
                "A-02",
            ),
            (
                "AZI-250",
                "Azithromycin 250 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "6",
                "300",
                "40",
                "A-02",
            ),
            (
                "LEV-50",
                "Levothyroxine 50 mcg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "100",
                "2500",
                "200",
                "A-01",
            ),
            (
                "PRED-5",
                "Prednisone 5 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "48",
                "750",
                "90",
                "A-02",
            ),
            (
                "GAB-300",
                "Gabapentin 300 mg capsules",
                units["CAP"],
                "CAP",
                "BOX",
                "100",
                "1400",
                "180",
                "A-02",
            ),
            (
                "ALP-05",
                "Alprazolam 0.5 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "60",
                "450",
                "50",
                "A-02",
            ),
            (
                "SER-50",
                "Sertraline 50 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "30",
                "1100",
                "120",
                "A-01",
            ),
            (
                "FLU-VAX",
                "Influenza Vaccine vial",
                units["VIAL"],
                "VIAL",
                "BOX",
                "10",
                "300",
                "50",
                "C-01",
            ),
            (
                "CIP-500",
                "Ciprofloxacin 500 mg tablets",
                units["TAB"],
                "TAB",
                "BOX",
                "50",
                "650",
                "70",
                "A-02",
            ),
        ]

        products = {}
        stock_specs = []
        for (
            sku,
            name,
            base_unit,
            base_code,
            pack_code,
            factor,
            on_hand,
            reorder,
            bin_code,
        ) in product_specs:
            product, _ = Product.objects.get_or_create(
                tenant=tenant,
                sku=sku,
                defaults={
                    "name": name,
                    "description": f"Pharmacy demo item. Stock is counted in {base_unit.name.lower()}s.",
                    "base_uom": base_unit,
                    "reorder_point": Decimal(reorder),
                },
            )
            products[sku] = product
            ProductUnit.objects.get_or_create(
                product=product,
                unit=units[pack_code],
                defaults={"factor": Decimal(factor)},
            )
            location = (
                locations[("COLD", bin_code)]
                if bin_code == "C-01"
                else locations[("MAIN", bin_code)]
            )
            WarehouseReorderPoint.objects.get_or_create(
                product=product,
                warehouse=location.warehouse,
                defaults={"quantity": Decimal(reorder)},
            )
            stock_specs.append((product, location, Decimal(on_hand), sku))

        for product, location, on_hand, sku in stock_specs:
            balance, created = StockBalance.objects.get_or_create(
                product=product,
                location=location,
                defaults={
                    "on_hand": on_hand,
                    "reserved": Decimal(20) if sku == "PAR-500" else Decimal(0),
                },
            )
            if created:
                movement_kind = (
                    StockMovement.Kind.RECEIPT
                    if sku == "AMX-250"
                    else StockMovement.Kind.ADJUSTMENT
                )
                note = (
                    "Demo partial PO receipt"
                    if sku == "AMX-250"
                    else "Demo opening stock"
                )
                StockMovement.objects.create(
                    product=product,
                    location=location,
                    quantity_change=on_hand,
                    kind=movement_kind,
                    note=note,
                    created_by=user,
                )

        OrganizationSettings.objects.get_or_create(
            tenant=tenant,
            defaults={
                "locale": "en-IN",
                "time_zone": "Asia/Kolkata",
                "currency": "INR",
            },
        )

        customer, _ = Customer.objects.get_or_create(
            tenant=tenant,
            name="Green Cross Community Pharmacy",
            defaults={
                "company": "Green Cross Pharmacy",
                "contact": "orders@greencross.example",
                "account_status": Customer.AccountStatus.ACTIVE,
                "tax_id": "GST-DEMO-29PHARM1234A1Z5",
                "credit_limit_minor": 2500000,
                "billing_address": "12 Market Road, Bengaluru, Karnataka",
                "shipping_address": "Receiving Bay, 12 Market Road, Bengaluru",
            },
        )
        walk_in_customer, _ = Customer.objects.get_or_create(
            tenant=tenant,
            name="Walk-in Customer",
            defaults={"account_status": Customer.AccountStatus.ACTIVE},
        )

        confirmed_order, _ = SalesOrder.objects.get_or_create(
            tenant=tenant,
            number="SO-DEMO-0001",
            defaults={
                "customer": customer,
                "status": SalesOrder.Status.CONFIRMED,
                "payment_status": SalesOrder.PaymentStatus.UNPAID,
                "fulfillment_status": SalesOrder.FulfillmentStatus.UNFULFILLED,
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully generated separate workspace for Tenant: {tenant.slug}"
            )
        )
