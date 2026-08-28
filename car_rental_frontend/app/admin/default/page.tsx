// app/admin/default/page.tsx

'use client'

import { useEffect, useState } from 'react'
import Widget from '@/components/widget/Widget'
import {
  MdDirectionsCar,
  MdBookOnline,
  MdStore,
  MdAttachMoney,
  MdPeople,
  MdGpsFixed,
} from 'react-icons/md'
import apiService from '@/app/services/apiService'

interface Stats {
  total_bookings: number
  total_cars: number
  total_vendors: number
  total_revenue: number
  pending_bookings: number
  pending_vendors: number
  completed_bookings: number
  cancelled_bookings: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function AdminDefaultPage() {
  const [stats, setStats] = useState<Stats>({
    total_bookings: 0,
    total_cars: 0,
    total_vendors: 0,
    total_revenue: 0,
    pending_bookings: 0,
    pending_vendors: 0,
    completed_bookings: 0,
    cancelled_bookings: 0,
  })
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [bookingsData, carsData, vendorsData, commissionData] = await Promise.all([
          apiService.get('/bookings/'),
          apiService.get('/cars/'),
          apiService.get('/vendors/admin/vendors/'),
          apiService.get('/vendors/admin/vendors/commission-summary/'),
        ])

        const bookings = Array.isArray(bookingsData)
          ? bookingsData
          : bookingsData?.results ?? []
        const cars = Array.isArray(carsData)
          ? carsData
          : carsData?.results ?? []
        const vendors = Array.isArray(vendorsData) ? vendorsData : []

        setStats({
          total_bookings: bookings.length,
          total_cars: cars.length,
          total_vendors: vendors.length,
          total_revenue: commissionData?.total_revenue ?? 0,
          pending_bookings: bookings.filter((b: any) => b.status === 'pending').length,
          pending_vendors: vendors.filter((v: any) => v.status === 'pending').length,
          completed_bookings: bookings.filter((b: any) => b.status === 'completed').length,
          cancelled_bookings: bookings.filter((b: any) => b.status === 'cancelled').length,
        })

        // most recent 5 bookings
        setRecentBookings(bookings.slice(0, 5))
      } catch (err) {
        console.error('Failed to load dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div>

      {/* ── Stat widgets ── */}
      <div className='mt-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-6'>
        <Widget
          icon={<MdBookOnline className='h-7 w-7' />}
          title='Total Bookings'
          subtitle={String(stats.total_bookings)}
        />
        <Widget
          icon={<MdDirectionsCar className='h-7 w-7' />}
          title='Total Cars'
          subtitle={String(stats.total_cars)}
        />
        <Widget
          icon={<MdStore className='h-7 w-7' />}
          title='Total Vendors'
          subtitle={String(stats.total_vendors)}
        />
        <Widget
          icon={<MdAttachMoney className='h-7 w-7' />}
          title='Total Revenue'
          subtitle={`OMR ${Number(stats.total_revenue).toFixed(2)}`}
        />
        <Widget
          icon={<MdGpsFixed className='h-7 w-7' />}
          title='Completed'
          subtitle={String(stats.completed_bookings)}
        />
        <Widget
          icon={<MdPeople className='h-7 w-7' />}
          title='Cancelled'
          subtitle={String(stats.cancelled_bookings)}
        />
      </div>

      {/* ── Alert banners ── */}
      {(stats.pending_bookings > 0 || stats.pending_vendors > 0) && (
        <div className='mt-5 grid grid-cols-1 gap-4 md:grid-cols-2'>
          {stats.pending_bookings > 0 && (
            <a
              href='/admin/bookings'
              className='flex items-center justify-between rounded-2xl bg-yellow-50 border border-yellow-200 px-5 py-4 hover:bg-yellow-100 transition'
            >
              <div>
                <p className='text-sm font-semibold text-yellow-800'>
                  {stats.pending_bookings} Pending Booking{stats.pending_bookings > 1 ? 's' : ''}
                </p>
                <p className='text-xs text-yellow-600 mt-0.5'>Click to review</p>
              </div>
              <span className='text-yellow-600 text-lg'>→</span>
            </a>
          )}
          {stats.pending_vendors > 0 && (
            <a
              href='/admin/vendors'
              className='flex items-center justify-between rounded-2xl bg-blue-50 border border-blue-200 px-5 py-4 hover:bg-blue-100 transition'
            >
              <div>
                <p className='text-sm font-semibold text-blue-800'>
                  {stats.pending_vendors} Vendor Application{stats.pending_vendors > 1 ? 's' : ''}
                </p>
                <p className='text-xs text-blue-600 mt-0.5'>Awaiting approval</p>
              </div>
              <span className='text-blue-600 text-lg'>→</span>
            </a>
          )}
        </div>
      )}

      {/* ── Recent bookings table ── */}
      <div className='mt-5'>
        <div className='rounded-2xl bg-white dark:bg-navy-800 p-5 shadow-sm border border-gray-100 dark:border-navy-700'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-bold text-navy-700 dark:text-white'>
              Recent Bookings
            </h2>
            <a href='/admin/bookings' className='text-sm text-blue-600 hover:underline'>
              View all →
            </a>
          </div>

          {loading ? (
            <p className='text-gray-400 text-sm py-6 text-center'>Loading...</p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-gray-400 text-xs uppercase border-b border-gray-100 dark:border-navy-700'>
                    <th className='pb-3 text-left font-medium'>ID</th>
                    <th className='pb-3 text-left font-medium'>Customer</th>
                    <th className='pb-3 text-left font-medium'>Car</th>
                    <th className='pb-3 text-left font-medium'>Pickup</th>
                    <th className='pb-3 text-left font-medium'>Return</th>
                    <th className='pb-3 text-right font-medium'>Amount</th>
                    <th className='pb-3 text-left font-medium'>Status</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-50 dark:divide-navy-700'>
                  {recentBookings.map((b: any) => (
                    <tr key={b.id} className='hover:bg-gray-50 dark:hover:bg-navy-700 transition'>
                      <td className='py-3 text-gray-400 font-mono text-xs'>#{b.id}</td>
                      <td className='py-3 font-medium text-navy-700 dark:text-white'>
                        {b.username}
                      </td>
                      <td className='py-3 text-gray-500 dark:text-gray-400'>
                        <p>{b.car_name}</p>
                        <p className='text-xs text-gray-400'>{b.car_brand}</p>
                      </td>
                      <td className='py-3 text-gray-500 text-xs'>{b.pickup_date}</td>
                      <td className='py-3 text-gray-500 text-xs'>{b.return_date}</td>
                      <td className='py-3 text-right font-semibold text-navy-700 dark:text-white'>
                        OMR {b.total_price}
                      </td>
                      <td className='py-3'>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                            STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!recentBookings.length && (
                    <tr>
                      <td colSpan={7} className='py-10 text-center text-gray-400'>
                        No bookings yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className='mt-5 grid grid-cols-2 md:grid-cols-4 gap-4'>
        {[
          { label: 'Manage Bookings', href: '/admin/bookings', icon: '📋', color: 'bg-blue-50 border-blue-100 text-blue-700' },
          { label: 'Manage Cars', href: '/admin/cars', icon: '🚗', color: 'bg-purple-50 border-purple-100 text-purple-700' },
          { label: 'Manage Vendors', href: '/admin/vendors', icon: '🏪', color: 'bg-green-50 border-green-100 text-green-700' },
          { label: 'GPS Tracking', href: '/admin/tracking', icon: '📡', color: 'bg-orange-50 border-orange-100 text-orange-700' },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-2xl border p-4 hover:opacity-80 transition ${link.color}`}
          >
            <span className='text-2xl'>{link.icon}</span>
            <span className='text-sm font-semibold'>{link.label}</span>
          </a>
        ))}
      </div>

    </div>
  )
}