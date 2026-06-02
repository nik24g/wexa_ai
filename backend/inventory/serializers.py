from rest_framework import serializers

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    effective_threshold = serializers.IntegerField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    last_updated_by_email = serializers.EmailField(
        source="last_updated_by.email", read_only=True, default=None
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "description",
            "quantity_on_hand",
            "cost_price",
            "selling_price",
            "low_stock_threshold",
            "effective_threshold",
            "is_low_stock",
            "last_updated_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "effective_threshold",
            "is_low_stock",
            "last_updated_by_email",
            "created_at",
            "updated_at",
        ]

    def validate_sku(self, value):
        """Enforce SKU uniqueness within the requesting user's organization."""
        request = self.context["request"]
        org = request.user.organization
        qs = Product.objects.filter(organization=org, sku__iexact=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A product with this SKU already exists in your organization."
            )
        return value


class StockAdjustSerializer(serializers.Serializer):
    """Apply a relative +/- change to a product's quantity on hand."""

    delta = serializers.IntegerField(
        help_text="Signed change to apply, e.g. 10 to add or -3 to remove."
    )
    note = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs["delta"] == 0:
            raise serializers.ValidationError({"delta": "Delta cannot be zero."})
        product = self.context["product"]
        if product.quantity_on_hand + attrs["delta"] < 0:
            raise serializers.ValidationError(
                {"delta": "Adjustment would make quantity negative."}
            )
        return attrs


class DashboardSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_quantity = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    low_stock_items = ProductSerializer(many=True)


class OrgSettingsSerializer(serializers.Serializer):
    default_low_stock_threshold = serializers.IntegerField(min_value=0)
