// app/admin/tracking/page.tsx
import GPSTrackingDashboard from '@/components/GPSTrackingDashboard'

export default function TrackingPage() {
  return (
    <div className='fixed inset-0 z-50'>
      <GPSTrackingDashboard />
    </div>
  )
}