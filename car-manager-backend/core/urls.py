from rest_framework.routers import DefaultRouter
from .views import CarViewSet, BookingViewSet

router = DefaultRouter()
router.register(r'cars', CarViewSet, basename='cars')
router.register(r'bookings', BookingViewSet, basename='bookings')

urlpatterns = router.urls