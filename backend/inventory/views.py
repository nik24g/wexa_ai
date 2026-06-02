from django.db.models import Sum
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product
from .serializers import (
    DashboardSerializer,
    OrgSettingsSerializer,
    ProductSerializer,
    StockAdjustSerializer,
)


def low_stock_products(org):
    """Return products at or below their effective low-stock threshold.

    Evaluated in Python because the threshold can fall back to an org default,
    which keeps the logic simple and correct for the MVP's data volumes.
    """
    return [p for p in org.products.all() if p.is_low_stock]


@extend_schema(tags=["Products"])
class ProductViewSet(viewsets.ModelViewSet):
    """CRUD for products. Every query is scoped to the caller's organization."""

    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "sku"]
    ordering_fields = ["name", "sku", "quantity_on_hand", "created_at", "updated_at"]

    def get_queryset(self):
        return Product.objects.filter(
            organization=self.request.user.organization
        ).select_related("organization", "last_updated_by")

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            last_updated_by=self.request.user,
        )

    def perform_update(self, serializer):
        serializer.save(last_updated_by=self.request.user)

    @extend_schema(request=StockAdjustSerializer, responses={200: ProductSerializer})
    @action(detail=True, methods=["post"], url_path="adjust-stock")
    def adjust_stock(self, request, pk=None):
        """Apply a relative +/- adjustment to a product's quantity on hand."""
        product = self.get_object()
        serializer = StockAdjustSerializer(
            data=request.data, context={"product": product}
        )
        serializer.is_valid(raise_exception=True)
        product.quantity_on_hand += serializer.validated_data["delta"]
        product.last_updated_by = request.user
        product.save(update_fields=["quantity_on_hand", "last_updated_by", "updated_at"])
        return Response(ProductSerializer(product, context={"request": request}).data)


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: DashboardSerializer}, tags=["Dashboard"])
    def get(self, request):
        org = request.user.organization
        products = org.products.all()
        total_products = products.count()
        total_quantity = products.aggregate(total=Sum("quantity_on_hand"))[
            "total"
        ] or 0
        low_items = low_stock_products(org)
        data = {
            "total_products": total_products,
            "total_quantity": total_quantity,
            "low_stock_count": len(low_items),
            "low_stock_items": ProductSerializer(
                low_items, many=True, context={"request": request}
            ).data,
        }
        return Response(data)


class OrgSettingsView(APIView):
    """Read and update the organization's default low-stock threshold."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: OrgSettingsSerializer}, tags=["Settings"])
    def get(self, request):
        org = request.user.organization
        return Response(
            {"default_low_stock_threshold": org.default_low_stock_threshold}
        )

    @extend_schema(
        request=OrgSettingsSerializer,
        responses={200: OrgSettingsSerializer},
        tags=["Settings"],
    )
    def patch(self, request):
        org = request.user.organization
        serializer = OrgSettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org.default_low_stock_threshold = serializer.validated_data[
            "default_low_stock_threshold"
        ]
        org.save(update_fields=["default_low_stock_threshold", "updated_at"])
        return Response(
            {"default_low_stock_threshold": org.default_low_stock_threshold}
        )
