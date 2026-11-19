from django.contrib import admin

from .models import (
    Brand,
    Lipgloss,
    Favorite,
    UserPreference,
    Cart, CartItem, Order, OrderItem
)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Lipgloss)
class LipglossAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "brand",
        "shade",
        "price",
        "is_active"
    )

    list_filter = (
        "brand",
        "is_active"
    )

    search_fields = (
        "name",
        "shade",
        "brand__name"
    )


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "lipgloss",
        "created_at"
    )


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "theme",
        "page_size"
    )


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "updated_at")


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("id", "cart", "lipgloss", "quantity")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ("lipgloss", "product_name", "brand_name", "shade", "unit_price", "quantity", "subtotal")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "total", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("user__username",)
    readonly_fields = ("user", "total", "idempotency_key", "created_at", "updated_at")
    inlines = [OrderItemInline]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
