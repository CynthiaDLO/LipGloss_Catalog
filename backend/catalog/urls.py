
from django.urls import path, include
from .admin_views import AdminDashboardView, AdminUserListView, AdminUserStatusView
from .preferences_views import FavoritesView, FavoriteDetailView, UserPreferencesView
from .commerce_views import (CartView, CartItemsView, CartItemDetailView, CheckoutView,
    OrderListView, OrderDetailView, AdminOrderListView, AdminOrderStatusView)
from rest_framework.routers import DefaultRouter

from .views import (
    RegisterView,
    CustomAuthToken,
    me,
    LogoutView,
    ResetTokenView,
    BrandViewSet,
    LipglossViewSet
)

router = DefaultRouter()

router.register(
    r"brands",
    BrandViewSet,
    basename="brand"
)

router.register(
    r"lipglosses",
    LipglossViewSet,
    basename="lipgloss"
)

urlpatterns = [
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("admin/users/", AdminUserListView.as_view(), name="admin-users"),
    path("admin/users/<int:user_id>/status/", AdminUserStatusView.as_view(), name="admin-user-status"),
    path("favorites/", FavoritesView.as_view(), name="favorites"),
    path("favorites/<int:product_id>/", FavoriteDetailView.as_view(), name="favorite-detail"),
    path("settings/", UserPreferencesView.as_view(), name="settings"),
    path("cart/", CartView.as_view(), name="cart"),
    path("cart/items/", CartItemsView.as_view(), name="cart-items"),
    path("cart/items/<int:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    path("orders/checkout/", CheckoutView.as_view(), name="checkout"),
    path("orders/", OrderListView.as_view(), name="orders"),
    path("orders/<int:order_id>/", OrderDetailView.as_view(), name="order-detail"),
    path("admin/orders/", AdminOrderListView.as_view(), name="admin-orders"),
    path("admin/orders/<int:order_id>/status/", AdminOrderStatusView.as_view(), name="admin-order-status"),
    path(
        "auth/register/",
        RegisterView.as_view(),
        name="register"
    ),

    path(
        "auth/login/",
        CustomAuthToken.as_view(),
        name="login"
    ),

    path(
        "auth/me/",
        me,
        name="me"
    ),

    path(
        "auth/logout/",
        LogoutView.as_view(),
        name="logout"
    ),

    path(
        "auth/reset-token/",
        ResetTokenView.as_view(),
        name="reset-token"
    ),
    path("", include(router.urls)),
]