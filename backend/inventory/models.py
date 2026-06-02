from django.conf import settings
from django.db import models

from accounts.models import Organization


class Product(models.Model):
    """A single inventory item, scoped to an organization.

    SKU is unique per organization (not globally), enforced by a constraint.
    """

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="products"
    )
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    quantity_on_hand = models.IntegerField(default=0)
    cost_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    selling_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    # When empty, the org's default_low_stock_threshold is used for low-stock logic.
    low_stock_threshold = models.PositiveIntegerField(null=True, blank=True)

    last_updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_products",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "sku"], name="unique_sku_per_org"
            )
        ]

    @property
    def effective_threshold(self) -> int:
        if self.low_stock_threshold is not None:
            return self.low_stock_threshold
        if self.organization_id:
            return self.organization.default_low_stock_threshold
        return settings.DEFAULT_LOW_STOCK_THRESHOLD

    @property
    def is_low_stock(self) -> bool:
        return self.quantity_on_hand <= self.effective_threshold

    def __str__(self) -> str:
        return f"{self.name} ({self.sku})"
