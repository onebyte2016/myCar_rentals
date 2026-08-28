from rest_framework.routers import DefaultRouter
from .views import CarViewSet, BookingViewSet
from django.urls import path, include
from userauths import views as userauths_view
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'cars', CarViewSet, basename='cars')
router.register(r'bookings', BookingViewSet, basename='bookings')

urlpatterns = [
    # API routes
    path('', include(router.urls)),

    # Auth routes
    # NOTE: these explicit `user/...` paths must stay ABOVE the generic
    # user list/detail routes below, otherwise the detail route's
    # `^user/(?P<pk>[^/.]+)/$` pattern would swallow paths like
    # `user/token/` and `user/register/` (treating "token"/"register" as a pk)
    # before Django ever reaches these entries.
    path('user/token/', userauths_view.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('user/register/', userauths_view.RegisterView.as_view()),
    path('user/verify-email/', userauths_view.VerifyEmailView.as_view()),
    path('user/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/logout/', userauths_view.LogoutView.as_view()),
    path('user/password/change/', userauths_view.ChangePasswordView.as_view(), name='password-change'),
    path('user/password/reset/', userauths_view.PasswordResetRequestView.as_view(), name='password-reset'),
    path('user/password/reset/confirm/', userauths_view.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    # Registered users list/detail (used by the admin "Users" page)
    path('user/', userauths_view.UserViewSet.as_view({'get': 'list'}), name='user-list'),
    path('user/<int:pk>/', userauths_view.UserViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='user-detail'),
]