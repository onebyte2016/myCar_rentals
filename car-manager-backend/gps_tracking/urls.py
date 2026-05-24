from django.urls import path
from .views import GPSUpdateView, LiveLocationsView, CarGPSHistoryView

urlpatterns = [
    # GPS device posts location here
    path('update/', GPSUpdateView.as_view(), name='gps-update'),

    # Admin: get all cars' latest locations
    path('live/', LiveLocationsView.as_view(), name='gps-live'),

    # Admin: get 24hr history for a specific car
    path('history/<int:car_id>/', CarGPSHistoryView.as_view(), name='gps-history'),
]

# In your main urls.py add:
# path('api/gps/', include('gps_tracking.urls')),