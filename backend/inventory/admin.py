from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "sku",
        "organization",
        "quantity_on_hand",
        "low_stock_threshold",
        "selling_price",
    )
    list_filter = ("organization",)
    search_fields = ("name", "sku")
