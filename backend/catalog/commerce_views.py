from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .commerce_serializers import (
    AddCartItemSerializer, AdminOrderSerializer, CartSerializer, CheckoutSerializer,
    OrderSerializer, OrderStatusSerializer, UpdateCartItemSerializer,
)
from .models import Cart, CartItem, Lipgloss, Order, OrderItem


def get_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return Cart.objects.prefetch_related(
        Prefetch("items", queryset=CartItem.objects.select_related("lipgloss__brand"))
    ).get(pk=cart.pk)


class CartView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)


class CartItemsView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data["product_id"]
        quantity = serializer.validated_data["quantity"]
        cart = get_cart(request.user)
        current_quantity = CartItem.objects.filter(cart=cart, lipgloss=product).values_list("quantity", flat=True).first() or 0
        if product.stock is not None and current_quantity + quantity > product.stock:
            raise ValidationError({"quantity": "No hay existencias suficientes para esa cantidad."})
        item, created = CartItem.objects.get_or_create(
            cart=cart, lipgloss=product, defaults={"quantity": quantity}
        )
        if not created:
            new_quantity = item.quantity + quantity
            if new_quantity > 99:
                raise ValidationError({"quantity": "No puedes agregar más de 99 unidades del mismo producto."})
            item.quantity = new_quantity
            item.save(update_fields=["quantity"])
        cart.save(update_fields=["updated_at"])
        return Response(
            CartSerializer(get_cart(request.user), context={"request": request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CartItemDetailView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_item(self, request, item_id):
        return get_object_or_404(CartItem, pk=item_id, cart__user=request.user)

    @transaction.atomic
    def patch(self, request, item_id):
        item = self.get_item(request, item_id)
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not item.lipgloss.is_active:
            raise ValidationError({"product": "Este producto ya no está disponible."})
        new_quantity = serializer.validated_data["quantity"]
        if item.lipgloss.stock is not None and new_quantity > item.lipgloss.stock:
            raise ValidationError({"quantity": "No hay existencias suficientes para esa cantidad."})
        item.quantity = new_quantity
        item.save(update_fields=["quantity"])
        item.cart.save(update_fields=["updated_at"])
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)

    @transaction.atomic
    def delete(self, request, item_id):
        item = self.get_item(request, item_id)
        cart = item.cart
        item.delete()
        cart.save(update_fields=["updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class CheckoutView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        key = serializer.validated_data["idempotency_key"]
        with transaction.atomic():
            existing = Order.objects.filter(user=request.user, idempotency_key=key).first()
            if existing:
                return Response(OrderSerializer(existing).data, status=status.HTTP_200_OK)
            cart = Cart.objects.select_for_update().filter(user=request.user).first()
            if not cart:
                raise ValidationError({"cart": "El carrito está vacío."})
            items = list(CartItem.objects.filter(cart=cart).select_related("lipgloss__brand"))
            # Lock products consistently during stock verification and decrement.
            products = {product.pk: product for product in Lipgloss.objects.select_for_update().filter(pk__in=[item.lipgloss_id for item in items]).order_by("pk")}
            if not items:
                raise ValidationError({"cart": "El carrito está vacío."})
            total = Decimal("0.00")
            for item in items:
                product = products[item.lipgloss_id]
                if not product.is_active:
                    raise ValidationError({"cart": f"El producto {product.name} ya no está disponible."})
                if product.stock is not None and item.quantity > product.stock:
                    raise ValidationError({"cart": f"No hay suficientes existencias de {product.name}."})
                if item.quantity < 1 or item.quantity > 99:
                    raise ValidationError({"cart": "Hay una cantidad inválida en el carrito."})
                total += item.lipgloss.price * item.quantity
            try:
                with transaction.atomic():
                    order = Order.objects.create(user=request.user, idempotency_key=key, total=total)
            except IntegrityError:
                # The nested savepoint leaves the outer transaction usable.
                order = Order.objects.get(user=request.user, idempotency_key=key)
                return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
            OrderItem.objects.bulk_create([
                OrderItem(
                    order=order, lipgloss=item.lipgloss, product_name=item.lipgloss.name,
                    brand_name=item.lipgloss.brand.name, shade=item.lipgloss.shade,
                    unit_price=item.lipgloss.price, quantity=item.quantity,
                    subtotal=item.lipgloss.price * item.quantity,
                ) for item in items
            ])
            for item in items:
                product = products[item.lipgloss_id]
                if product.stock is not None:
                    product.stock -= item.quantity
                    product.save(update_fields=["stock"])
            CartItem.objects.filter(cart=cart).delete()
            cart.save(update_fields=["updated_at"])
            order = Order.objects.prefetch_related("items").get(pk=order.pk)
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderListView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).prefetch_related("items")
        return Response(OrderSerializer(orders, many=True).data)


class OrderDetailView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(
            Order.objects.filter(user=request.user).prefetch_related("items"), pk=order_id
        )
        return Response(OrderSerializer(order).data)


class AdminOrderListView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        orders = Order.objects.select_related("user").prefetch_related("items")
        return Response(AdminOrderSerializer(orders, many=True).data)


class AdminOrderStatusView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]
    ALLOWED_TRANSITIONS = {
        Order.Status.PLACED: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
        Order.Status.CONFIRMED: {Order.Status.SHIPPED, Order.Status.CANCELLED},
        Order.Status.SHIPPED: {Order.Status.DELIVERED},
        Order.Status.DELIVERED: set(),
        Order.Status.CANCELLED: set(),
    }

    @transaction.atomic
    def patch(self, request, order_id):
        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = get_object_or_404(Order.objects.select_for_update(), pk=order_id)
        new_status = serializer.validated_data["status"]
        if new_status not in self.ALLOWED_TRANSITIONS[order.status]:
            raise ValidationError({"status": "No se permite este cambio de estado."})
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])
        return Response(AdminOrderSerializer(order).data)
