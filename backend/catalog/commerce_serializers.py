from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem, Lipgloss


class CartItemSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "product", "quantity", "subtotal"]

    def get_product(self, obj):
        product = obj.lipgloss
        return {
            "id": product.pk,
            "name": product.name,
            "shade": product.shade,
            "brand": product.brand.name,
            "price": str(product.price),
            "image": self.context["request"].build_absolute_uri(product.image.url) if product.image else None,
        }

    def get_subtotal(self, obj):
        return str(obj.lipgloss.price * obj.quantity)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["items", "item_count", "total", "updated_at"]

    def get_total(self, obj):
        return str(sum((item.lipgloss.price * item.quantity for item in obj.items.all()), 0))

    def get_item_count(self, obj):
        return sum(item.quantity for item in obj.items.all())


class AddCartItemSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(queryset=Lipgloss.objects.filter(is_active=True))
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class CheckoutSerializer(serializers.Serializer):
    idempotency_key = serializers.UUIDField(required=True)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "lipgloss", "product_name", "brand_name", "shade", "unit_price", "quantity", "subtotal"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = ["id", "status", "status_display", "total", "items", "created_at", "updated_at"]


class AdminOrderSerializer(OrderSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ["username", "user"]


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
