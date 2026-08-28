
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import apiService from '@/app/services/apiService'

interface VendorProfile {
  business_name: string
  status: string
  commission_rate: number
  total_earnings: number
  total_commission: number
  total_bookings: number
  total_cars: number
}

interface Earning {
  id: number
  booking_id: number
  car_name: string
  customer: string
  pickup_date: string
  return_date: string
  booking_amount: string
  commission_rate: string
  commission_amount: string
  vendor_amount: string
  status: string
  created_at: string
}

interface EarningsSummary {
  summary: {
    total_earnings: number
    total_commission: number
    total_bookings: number
    total_cars: number
    commission_rate: number
    pending_payout: number
  }
  earnings: Earning[]
}

type Tab = 'overview' | 'earnings' | 'bookings' | 'cars'

export default function VendorDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary | null>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [cars, setCars] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, earningsData, bookingsData, carsData] = await Promise.all([
          apiService.get('/vendors/me/'),
          apiService.get('/vendors/earnings/'),
          apiService.get('/vendors/bookings/'),
          apiService.get('/vendors/cars/'),
        ])

        setProfile(profileData)
        setEarningsSummary(earningsData)

        setBookings(
          Array.isArray(bookingsData) ? bookingsData :
          Array.isArray(bookingsData?.results) ? bookingsData.results : []
        )
        setCars(
          Array.isArray(carsData) ? carsData :
          Array.isArray(carsData?.results) ? carsData.results : []
        )
      } catch (err) {
        console.error('Failed to load vendor dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='text-gray-400'>Loading dashboard...</div>
    </div>
  )

  if (!profile) return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='text-center'>
        <p className='text-gray-500'>No vendor profile found.</p>
        <Link href='/vendor/register' className='text-blue-600 mt-2 inline-block hover:underline'>
          Apply to become a vendor
        </Link>
      </div>
    </div>
  )

  // Calculate pending payout directly from earnings list
  const pendingPayout = earningsSummary?.earnings
    ?.filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + parseFloat(e.vendor_amount || '0'), 0) ?? 0

  const statusColor: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    suspended: 'bg-red-100 text-red-700',
    rejected: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className='min-h-screen bg-gray-50'>

      {/* ── Vendor Navbar ── */}
      <nav className='bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10'>
        <div className='max-w-6xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            <Link href='/' className='font-bold text-blue-600 text-lg'>
              Abeliza
            </Link>
            <span className='text-gray-300'>|</span>
            <span className='text-sm font-medium text-gray-500'>Vendor Portal</span>
          </div>

          <div className='flex items-center gap-4'>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor[profile.status]}`}>
              {profile.status}
            </span>
            <span className='text-sm font-medium text-gray-700 hidden md:block'>
              {profile.business_name}
            </span>
            <button
              onClick={() => router.push('/vendor/cars/add')}
              className='bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition'
            >
              + Add Car
            </button>
          </div>
        </div>
      </nav>

      <div className='max-w-6xl mx-auto px-6 py-8'>

        {/* Pending notice */}
        {profile.status === 'pending' && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-700'>
            ⏳ Your application is under review. You'll be able to list cars once approved.
          </div>
        )}

        {profile.status === 'rejected' && (
          <div className='bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700'>
            ❌ Your application was rejected. Please contact support for more information.
          </div>
        )}

        {/* Stats */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
          <StatCard
            label='Total Earnings'
            value={`OMR ${earningsSummary?.summary?.total_earnings?.toFixed(2) ?? '0.00'}`}
            color='green'
          />
          <StatCard
            label='Commission Paid'
            value={`OMR ${earningsSummary?.summary?.total_commission?.toFixed(2) ?? '0.00'}`}
            color='red'
          />
          <StatCard
            label='Total Bookings'
            value={String(earningsSummary?.summary?.total_bookings ?? profile.total_bookings ?? 0)}
            color='blue'
          />
          <StatCard
            label='Active Cars'
            value={String(earningsSummary?.summary?.total_cars ?? profile.total_cars ?? 0)}
            color='purple'
          />
        </div>

        {/* Tabs */}
        <div className='flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit'>
          {(['overview', 'earnings', 'bookings', 'cars'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div className='bg-white rounded-2xl border border-gray-100 p-6'>
            <h3 className='font-semibold text-gray-800 mb-4'>Earnings Overview</h3>
            <div className='grid grid-cols-2 gap-4'>
              <div className='bg-green-50 rounded-xl p-4'>
                <p className='text-xs text-green-600 font-medium'>Pending Payout</p>
                <p className='text-2xl font-bold text-green-700 mt-1'>
                  OMR {pendingPayout.toFixed(2)}
                </p>
                <p className='text-xs text-green-500 mt-1'>
                  From {earningsSummary?.earnings?.filter(e => e.status === 'pending').length ?? 0} unpaid booking(s)
                </p>
              </div>
              <div className='bg-blue-50 rounded-xl p-4'>
                <p className='text-xs text-blue-600 font-medium'>Platform Commission Rate</p>
                <p className='text-2xl font-bold text-blue-700 mt-1'>
                  {earningsSummary?.summary?.commission_rate ?? profile.commission_rate}%
                </p>
                <p className='text-xs text-blue-500 mt-1'>Platform keeps this % per booking</p>
              </div>
            </div>

            {/* Recent earnings preview */}
            {earningsSummary?.earnings && earningsSummary.earnings.length > 0 && (
              <div className='mt-6'>
                <h4 className='text-sm font-semibold text-gray-600 mb-3'>Recent Earnings</h4>
                <div className='space-y-2'>
                  {earningsSummary.earnings.slice(0, 3).map((e) => (
                    <div key={e.id} className='flex justify-between items-center text-sm py-2 border-b border-gray-50'>
                      <div>
                        <p className='font-medium text-gray-700'>{e.car_name}</p>
                        <p className='text-xs text-gray-400'>{e.pickup_date} → {e.return_date}</p>
                      </div>
                      <div className='text-right'>
                        <p className='font-semibold text-green-600'>OMR {e.vendor_amount}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          e.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {e.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setTab('earnings')}
                  className='text-sm text-blue-600 hover:underline mt-3'
                >
                  View all earnings →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Earnings tab ── */}
        {tab === 'earnings' && (
          <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
            <div className='px-6 py-4 border-b border-gray-50'>
              <h3 className='font-semibold text-gray-800'>Earnings History</h3>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 text-gray-500 text-xs uppercase'>
                  <tr>
                    <th className='px-4 py-3 text-left'>Car</th>
                    <th className='px-4 py-3 text-left'>Customer</th>
                    <th className='px-4 py-3 text-left'>Dates</th>
                    <th className='px-4 py-3 text-right'>Total</th>
                    <th className='px-4 py-3 text-right'>Commission</th>
                    <th className='px-4 py-3 text-right'>You Earn</th>
                    <th className='px-4 py-3 text-left'>Status</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-50'>
                  {earningsSummary?.earnings?.map((e) => (
                    <tr key={e.id} className='hover:bg-gray-50'>
                      <td className='px-4 py-3 font-medium text-gray-800'>{e.car_name}</td>
                      <td className='px-4 py-3 text-gray-500'>{e.customer}</td>
                      <td className='px-4 py-3 text-gray-500'>{e.pickup_date} → {e.return_date}</td>
                      <td className='px-4 py-3 text-right text-gray-800'>OMR {e.booking_amount}</td>
                      <td className='px-4 py-3 text-right text-red-500'>-OMR {e.commission_amount}</td>
                      <td className='px-4 py-3 text-right font-semibold text-green-600'>OMR {e.vendor_amount}</td>
                      <td className='px-4 py-3'>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          e.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!earningsSummary?.earnings?.length && (
                    <tr>
                      <td colSpan={7} className='px-4 py-8 text-center text-gray-400'>No earnings yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Bookings tab ── */}
        {tab === 'bookings' && (
          <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
            <div className='px-6 py-4 border-b border-gray-50'>
              <h3 className='font-semibold text-gray-800'>Bookings ({bookings.length})</h3>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 text-gray-500 text-xs uppercase'>
                  <tr>
                    <th className='px-4 py-3 text-left'>ID</th>
                    <th className='px-4 py-3 text-left'>Car</th>
                    <th className='px-4 py-3 text-left'>Customer</th>
                    <th className='px-4 py-3 text-left'>Pickup</th>
                    <th className='px-4 py-3 text-left'>Return</th>
                    <th className='px-4 py-3 text-right'>Amount</th>
                    <th className='px-4 py-3 text-left'>Status</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-50'>
                  {bookings.map((b: any) => (
                    <tr key={b.id} className='hover:bg-gray-50'>
                      <td className='px-4 py-3 text-gray-400'>#{b.id}</td>
                      <td className='px-4 py-3 font-medium text-gray-800'>{b.car_name}</td>
                      <td className='px-4 py-3 text-gray-500'>{b.username}</td>
                      <td className='px-4 py-3 text-gray-500'>{b.pickup_date}</td>
                      <td className='px-4 py-3 text-gray-500'>{b.return_date}</td>
                      <td className='px-4 py-3 text-right font-semibold'>OMR {b.total_price}</td>
                      <td className='px-4 py-3'><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                  {!bookings.length && (
                    <tr>
                      <td colSpan={7} className='px-4 py-8 text-center text-gray-400'>No bookings yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Cars tab ── */}
        {tab === 'cars' && (
          <div>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='font-semibold text-gray-800'>Your Cars ({cars.length})</h3>
              <button
                onClick={() => router.push('/vendor/cars/add')}
                className='bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition'
              >
                + Add Car
              </button>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {cars.map((car: any) => (
                <div key={car.id} className='bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition'>
                  {car.car_image && (
                    <img src={car.car_image} alt={car.name} className='w-full h-40 object-cover' />
                  )}
                  <div className='p-4'>
                    <p className='font-semibold text-gray-800'>{car.name}</p>
                    <p className='text-sm text-gray-400'>{car.plate_number}</p>
                    <div className='flex justify-between items-center mt-3'>
                      <span className='text-blue-600 font-bold'>OMR {car.price_per_day}/day</span>
                      <StatusBadge status={car.status} />
                    </div>
                  </div>
                </div>
              ))}
              {!cars.length && (
                <div className='col-span-3 text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100'>
                  <p className='text-4xl mb-3'>🚗</p>
                  <p className='font-medium'>No cars listed yet</p>
                  <button
                    onClick={() => router.push('/vendor/cars/add')}
                    className='mt-3 text-blue-600 hover:underline text-sm'
                  >
                    Add your first car →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <div className={`rounded-2xl p-5 ${colors[color]}`}>
      <p className='text-xs font-medium opacity-70'>{label}</p>
      <p className='text-2xl font-bold mt-1'>{value}</p>
    </div>
  )
}

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    available: 'bg-green-100 text-green-700',
    unavailable: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

// import { useEffect, useState } from 'react'
// import apiService from '@/app/services/apiService'

// interface VendorProfile {
//   business_name: string
//   status: string
//   commission_rate: number
//   total_earnings: number
//   total_commission: number
//   total_bookings: number
//   total_cars: number
// }

// interface Earning {
//   id: number
//   booking_id: number
//   car_name: string
//   customer: string
//   pickup_date: string
//   return_date: string
//   booking_amount: string
//   commission_rate: string
//   commission_amount: string
//   vendor_amount: string
//   status: string
//   created_at: string
// }

// interface EarningsSummary {
//   summary: {
//     total_earnings: number
//     total_commission: number
//     total_bookings: number
//     total_cars: number
//     commission_rate: number
//     pending_payout: number
//   }
//   earnings: Earning[]
// }

// type Tab = 'overview' | 'earnings' | 'bookings' | 'cars'

// export default function VendorDashboard() {
//   const [profile, setProfile] = useState<VendorProfile | null>(null)
//   const [earningsSummary, setEarningsSummary] = useState<EarningsSummary | null>(null)
//   const [bookings, setBookings] = useState<any[]>([])
//   const [cars, setCars] = useState<any[]>([])
//   const [tab, setTab] = useState<Tab>('overview')
//   const [loading, setLoading] = useState(true)


//   useEffect(() => {
//   const fetchData = async () => {
//     try {
//       const [profileData, earningsData, bookingsData, carsData] = await Promise.all([
//         apiService.get('/vendors/me/'),
//         apiService.get('/vendors/earnings/'),
//         apiService.get('/vendors/bookings/'),
//         apiService.get('/vendors/cars/'),
//       ])

//       setProfile(profileData)
//       setEarningsSummary(earningsData)

//       // Safely extract arrays — API might return { results: [...] } or plain array
//       setBookings(
//         Array.isArray(bookingsData) ? bookingsData :
//         Array.isArray(bookingsData?.results) ? bookingsData.results : []
//       )
//       setCars(
//         Array.isArray(carsData) ? carsData :
//         Array.isArray(carsData?.results) ? carsData.results : []
//       )

//     } catch (err) {
//       console.error('Failed to load vendor dashboard:', err)
//     } finally {
//       setLoading(false)
//     }
//   }
//   fetchData()
// }, [])

//   if (loading) return (
//     <div className='min-h-screen flex items-center justify-center bg-gray-50'>
//       <div className='text-gray-400'>Loading dashboard...</div>
//     </div>
//   )

//   if (!profile) return (
//     <div className='min-h-screen flex items-center justify-center bg-gray-50'>
//       <div className='text-center'>
//         <p className='text-gray-500'>No vendor profile found.</p>
//         <a href='/vendor/register' className='text-blue-600 mt-2 inline-block hover:underline'>
//           Apply to become a vendor
//         </a>
//       </div>
//     </div>
//   )

//   const statusColor: Record<string, string> = {
//     approved: 'bg-green-100 text-green-700',
//     pending: 'bg-yellow-100 text-yellow-700',
//     suspended: 'bg-red-100 text-red-700',
//     rejected: 'bg-gray-100 text-gray-600',
//   }

//   return (
//     <div className='min-h-screen bg-gray-50'>

//       {/* Header */}
//       <div className='bg-white border-b border-gray-100 px-6 py-5'>
//         <div className='max-w-6xl mx-auto flex items-center justify-between'>
//           <div>
//             <h1 className='text-xl font-bold text-gray-900'>{profile.business_name}</h1>
//             <div className='flex items-center gap-3 mt-1'>
//               <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${statusColor[profile.status]}`}>
//                 {profile.status}
//               </span>
//               <span className='text-xs text-gray-400'>
//                 Commission rate: <span className='font-semibold text-gray-600'>{profile.commission_rate}%</span>
//               </span>
//             </div>
//           </div>
//           <a
//             href='/vendor/cars/add'
//             className='bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition'
//           >
//             + Add Car
//           </a>
//         </div>
//       </div>

//       <div className='max-w-6xl mx-auto px-6 py-8'>

//         {/* Pending notice */}
//         {profile.status === 'pending' && (
//           <div className='bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-700'>
//             ⏳ Your application is under review. You'll be able to list cars once approved.
//           </div>
//         )}

//         {/* Stats */}
//         <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
//           <StatCard label='Total Earnings' value={`$${earningsSummary?.summary?.total_earnings?.toFixed(2) ?? '0.00'}`} color='green' />
//           <StatCard label='Commission Paid' value={`$${earningsSummary?.summary?.total_commission?.toFixed(2) ?? '0.00'}`} color='red' />
//           <StatCard label='Total Bookings' value={String(profile.total_bookings)} color='blue' />
//           <StatCard label='Active Cars' value={String(profile.total_cars)} color='purple' />
//         </div>

//         {/* Tabs */}
//         <div className='flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit'>
//           {(['overview', 'earnings', 'bookings', 'cars'] as Tab[]).map((t) => (
//             <button
//               key={t}
//               onClick={() => setTab(t)}
//               className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
//                 tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
//               }`}
//             >
//               {t}
//             </button>
//           ))}
//         </div>

//         {/* Tab content */}
//         {tab === 'overview' && earningsSummary && (
//           <div className='bg-white rounded-2xl border border-gray-100 p-6'>
//             <h3 className='font-semibold text-gray-800 mb-4'>Earnings Overview</h3>
//             <div className='grid grid-cols-2 gap-4'>
//               <div className='bg-green-50 rounded-xl p-4'>
//                 <p className='text-xs text-green-600 font-medium'>Pending Payout</p>
//                 <p className='text-2xl font-bold text-green-700 mt-1'>
//                   ${earningsSummary?.summary?.pending_payout?.toFixed(2) ?? '0.00'}
//                 </p>
//               </div>
//               <div className='bg-blue-50 rounded-xl p-4'>
//                 <p className='text-xs text-blue-600 font-medium'>Your Commission Rate</p>
//                 <p className='text-2xl font-bold text-blue-700 mt-1'>
//                   {earningsSummary?.summary?.commission_rate ?? profile.commission_rate}%
//                 </p>
//                 <p className='text-xs text-blue-500 mt-1'>Platform keeps this % per booking</p>
//               </div>
//             </div>
//           </div>
//         )}

//         {tab === 'earnings' && (
//           <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
//             <div className='px-6 py-4 border-b border-gray-50'>
//               <h3 className='font-semibold text-gray-800'>Earnings History</h3>
//             </div>
//             <div className='overflow-x-auto'>
//               <table className='w-full text-sm'>
//                 <thead className='bg-gray-50 text-gray-500 text-xs uppercase'>
//                   <tr>
//                     <th className='px-4 py-3 text-left'>Car</th>
//                     <th className='px-4 py-3 text-left'>Customer</th>
//                     <th className='px-4 py-3 text-left'>Dates</th>
//                     <th className='px-4 py-3 text-right'>Total</th>
//                     <th className='px-4 py-3 text-right'>Commission</th>
//                     <th className='px-4 py-3 text-right'>You Earn</th>
//                     <th className='px-4 py-3 text-left'>Status</th>
//                   </tr>
//                 </thead>
//                 <tbody className='divide-y divide-gray-50'>
//                   {earningsSummary?.earnings?.map((e) => (
//                     <tr key={e.id} className='hover:bg-gray-50'>
//                       <td className='px-4 py-3 font-medium text-gray-800'>{e.car_name}</td>
//                       <td className='px-4 py-3 text-gray-500'>{e.customer}</td>
//                       <td className='px-4 py-3 text-gray-500'>
//                         {e.pickup_date} → {e.return_date}
//                       </td>
//                       <td className='px-4 py-3 text-right text-gray-800'>${e.booking_amount}</td>
//                       <td className='px-4 py-3 text-right text-red-500'>-${e.commission_amount}</td>
//                       <td className='px-4 py-3 text-right font-semibold text-green-600'>${e.vendor_amount}</td>
//                       <td className='px-4 py-3'>
//                         <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
//                           e.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
//                         }`}>
//                           {e.status}
//                         </span>
//                       </td>
//                     </tr>
//                   ))}
//                   {!earningsSummary?.earnings?.length && (
//                     <tr>
//                       <td colSpan={7} className='px-4 py-8 text-center text-gray-400'>
//                         No earnings yet
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}

//         {tab === 'bookings' && (
//           <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
//             <div className='px-6 py-4 border-b border-gray-50'>
//               <h3 className='font-semibold text-gray-800'>Bookings</h3>
//             </div>
//             <div className='overflow-x-auto'>
//               <table className='w-full text-sm'>
//                 <thead className='bg-gray-50 text-gray-500 text-xs uppercase'>
//                   <tr>
//                     <th className='px-4 py-3 text-left'>ID</th>
//                     <th className='px-4 py-3 text-left'>Car</th>
//                     <th className='px-4 py-3 text-left'>Customer</th>
//                     <th className='px-4 py-3 text-left'>Pickup</th>
//                     <th className='px-4 py-3 text-left'>Return</th>
//                     <th className='px-4 py-3 text-right'>Amount</th>
//                     <th className='px-4 py-3 text-left'>Status</th>
//                   </tr>
//                 </thead>
//                 <tbody className='divide-y divide-gray-50'>
//                   {bookings.map((b: any) => (
//                     <tr key={b.id} className='hover:bg-gray-50'>
//                       <td className='px-4 py-3 text-gray-400'>#{b.id}</td>
//                       <td className='px-4 py-3 font-medium text-gray-800'>{b.car_name}</td>
//                       <td className='px-4 py-3 text-gray-500'>{b.username}</td>
//                       <td className='px-4 py-3 text-gray-500'>{b.pickup_date}</td>
//                       <td className='px-4 py-3 text-gray-500'>{b.return_date}</td>
//                       <td className='px-4 py-3 text-right font-semibold'>${b.total_price}</td>
//                       <td className='px-4 py-3'>
//                         <StatusBadge status={b.status} />
//                       </td>
//                     </tr>
//                   ))}
//                   {!bookings.length && (
//                     <tr>
//                       <td colSpan={7} className='px-4 py-8 text-center text-gray-400'>No bookings yet</td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}

//         {tab === 'cars' && (
//           <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
//             {cars.map((car: any) => (
//               <div key={car.id} className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
//                 {car.car_image && (
//                   <img src={car.car_image} alt={car.name} className='w-full h-40 object-cover' />
//                 )}
//                 <div className='p-4'>
//                   <p className='font-semibold text-gray-800'>{car.name}</p>
//                   <p className='text-sm text-gray-400'>{car.plate_number}</p>
//                   <div className='flex justify-between items-center mt-3'>
//                     <span className='text-blue-600 font-bold'>${car.price_per_day}/day</span>
//                     <StatusBadge status={car.status} />
//                   </div>
//                 </div>
//               </div>
//             ))}
//             {!cars.length && (
//               <div className='col-span-3 text-center py-12 text-gray-400'>
//                 No cars listed yet.{' '}
//                 <a href='/vendor/cars/add' className='text-blue-600 hover:underline'>Add your first car</a>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => {
//   const colors: Record<string, string> = {
//     green: 'bg-green-50 text-green-700',
//     red: 'bg-red-50 text-red-600',
//     blue: 'bg-blue-50 text-blue-700',
//     purple: 'bg-purple-50 text-purple-700',
//   }
//   return (
//     <div className={`rounded-2xl p-5 ${colors[color]}`}>
//       <p className='text-xs font-medium opacity-70'>{label}</p>
//       <p className='text-2xl font-bold mt-1'>{value}</p>
//     </div>
//   )
// }

// const StatusBadge = ({ status }: { status: string }) => {
//   const colors: Record<string, string> = {
//     pending: 'bg-yellow-100 text-yellow-700',
//     confirmed: 'bg-blue-100 text-blue-700',
//     completed: 'bg-green-100 text-green-700',
//     cancelled: 'bg-red-100 text-red-600',
//     available: 'bg-green-100 text-green-700',
//     unavailable: 'bg-gray-100 text-gray-500',
//   }
//   return (
//     <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
//       {status}
//     </span>
//   )
// }