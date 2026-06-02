"""Seed demo data for local demos / reviews.

Creates:
  * A Django superuser for the admin site (/admin/).
  * A demo organization + owner user you can log into the app with.
  * A handful of sample products (some intentionally low on stock).

Usage:
    python manage.py seed_demo

All accounts/passwords can be overridden via flags; see add_arguments.
Running it more than once won't create duplicates.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Organization
from inventory.models import Product

User = get_user_model()

SAMPLE_PRODUCTS = [
    # name, sku, qty, cost, selling, threshold(None => org default)
    ("Blue Ballpoint Pen", "PEN-BLU-001", 2, "0.20", "1.50", 5),
    ("A4 Notebook", "NB-A4-100", 4, "1.10", "3.99", None),
    ("Stapler", "STP-STD-001", 50, "2.50", "6.00", None),
    ("Sticky Notes (Pack)", "STK-100", 0, "0.80", "2.49", 3),
    ("Highlighter Set", "HL-SET-004", 12, "1.75", "4.25", None),
    ("Desk Organizer", "ORG-DSK-001", 8, "5.00", "12.99", None),
]


class Command(BaseCommand):
    help = "Seed a demo superuser, organization, owner user, and sample products."

    def add_arguments(self, parser):
        parser.add_argument("--admin-email", default="admin@stockflow.com")
        parser.add_argument("--admin-password", default="Admin12345!")
        parser.add_argument("--demo-email", default="demo@stockflow.com")
        parser.add_argument("--demo-password", default="DemoPass123!")
        parser.add_argument("--org-name", default="Demo Store")

    @transaction.atomic
    def handle(self, *args, **opts):
        # 1. Superuser for the Django admin.
        admin_email = opts["admin_email"]
        if not User.objects.filter(email=admin_email).exists():
            User.objects.create_superuser(
                email=admin_email, password=opts["admin_password"]
            )
            self.stdout.write(self.style.SUCCESS(f"Created superuser {admin_email}"))
        else:
            self.stdout.write(f"Superuser {admin_email} already exists, skipping.")

        # 2. Demo organization + owner user for logging into the app.
        org, _ = Organization.objects.get_or_create(
            name=opts["org_name"], defaults={"default_low_stock_threshold": 5}
        )
        demo_email = opts["demo_email"]
        user = User.objects.filter(email=demo_email).first()
        if user is None:
            user = User.objects.create_user(
                email=demo_email, password=opts["demo_password"], organization=org
            )
            self.stdout.write(self.style.SUCCESS(f"Created demo user {demo_email}"))
        else:
            self.stdout.write(f"Demo user {demo_email} already exists, skipping.")

        # 3. Sample products (idempotent on SKU within the org).
        created = 0
        for name, sku, qty, cost, selling, threshold in SAMPLE_PRODUCTS:
            _, was_created = Product.objects.get_or_create(
                organization=org,
                sku=sku,
                defaults={
                    "name": name,
                    "quantity_on_hand": qty,
                    "cost_price": Decimal(cost),
                    "selling_price": Decimal(selling),
                    "low_stock_threshold": threshold,
                    "last_updated_by": user,
                },
            )
            created += int(was_created)
        self.stdout.write(
            self.style.SUCCESS(f"Sample products ready ({created} newly created).")
        )

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("Demo credentials"))
        self.stdout.write(f"  App login : {demo_email} / {opts['demo_password']}")
        self.stdout.write(f"  Admin site: {admin_email} / {opts['admin_password']}")
