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
    path('user/token/', userauths_view.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('user/register/', userauths_view.RegisterView.as_view()),
    path('user/verify-email/', userauths_view.VerifyEmailView.as_view()),
    path('user/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/logout/', userauths_view.LogoutView.as_view()),
]