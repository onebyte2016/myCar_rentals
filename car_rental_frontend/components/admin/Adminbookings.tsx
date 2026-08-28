'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import apiService from '@/app/services/apiService'

/* ── Types ─────────────────────────────────────────────── */
interface Booking {
  id: number
  car: number
  car_name: string
  car_brand: string
  car_image: string
  user: number
  username: string
  email: string
  pickup_date: string
  return_date: string
  pickup_location: string
  dropoff_location: string
  total_price: string
  status: string
  payment_status: string
  driving_license_no: string | null
  passport_no: string | null
  nationality: string | null
  date_birth: string | null
  gsm: string | null
  address: string | null
  issued_at: string | null
  created_at: string
}

interface Car {
  id: number
  name: string
}

type View = 'list' | 'detail' | 'edit' | 'create'
type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled']
const PAYMENT_OPTIONS = ['unpaid', 'paid', 'refunded']

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  refunded: 'bg-gray-100 text-gray-600',
}

/* ── Main Component ─────────────────────────────────────── */
export default function AdminBookings() {
  const [view, setView] = useState<View>('list')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filtered, setFiltered] = useState<Booking[]>([])
  const [selected, setSelected] = useState<Booking | null>(null)
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const emptyForm = {
    car: '',
    pickup_date: '',
    return_date: '',
    pickup_location: '',
    dropoff_location: '',
    total_price: '',
    status: 'pending',
    payment_status: 'unpaid',
    driving_license_no: '',
    passport_no: '',
    nationality: '',
    date_birth: '',
    gsm: '',
    address: '',
    issued_at: '',
  }
  const [form, setForm] = useState<Record<string, string>>(emptyForm)

  /* fetch all bookings */
  const fetchBookings = useCallback(async () => {
    try {
      const data = await apiService.get('/bookings/')
      const list = Array.isArray(data) ? data : data?.results ?? []
      setBookings(list)
      setFiltered(list)
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* fetch cars for create form */
  const fetchCars = useCallback(async () => {
    try {
      const data = await apiService.get('/cars/')
      setCars(Array.isArray(data) ? data : data?.results ?? [])
    } catch (err) {
      console.error('Failed to load cars:', err)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
    fetchCars()
  }, [fetchBookings, fetchCars])

  /* filter bookings */
  useEffect(() => {
    let list = bookings
    if (statusFilter !== 'all') list = list.filter((b) => b.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (b) =>
          b.username?.toLowerCase().includes(q) ||
          b.car_name?.toLowerCase().includes(q) ||
          b.car_brand?.toLowerCase().includes(q) ||
          String(b.id).includes(q) ||
          b.gsm?.toLowerCase().includes(q) ||
          b.passport_no?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [bookings, statusFilter, search])

  /* open detail */
  const openDetail = (b: Booking) => {
    setSelected(b)
    setView('detail')
  }

  /* open edit */
  const openEdit = (b: Booking) => {
    setSelected(b)
    setForm({
      car: String(b.car),
      pickup_date: b.pickup_date ?? '',
      return_date: b.return_date ?? '',
      pickup_location: b.pickup_location ?? '',
      dropoff_location: b.dropoff_location ?? '',
      total_price: b.total_price ?? '',
      status: b.status ?? 'pending',
      payment_status: b.payment_status ?? 'unpaid',
      driving_license_no: b.driving_license_no ?? '',
      passport_no: b.passport_no ?? '',
      nationality: b.nationality ?? '',
      date_birth: b.date_birth ?? '',
      gsm: b.gsm ?? '',
      address: b.address ?? '',
      issued_at: b.issued_at ?? '',
    })
    setView('edit')
  }

  /* open create */
  const openCreate = () => {
    setSelected(null)
    setForm(emptyForm)
    setView('create')
  }

  /* save edit */
  const handleSave = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await apiService.patch(`/bookings/${selected.id}/`, form)
      await fetchBookings()
      setView('list')
    } catch (err: any) {
      alert(err?.message || 'Failed to update booking')
    } finally {
      setActionLoading(false)
    }
  }

  /* create booking */
  const handleCreate = async () => {
    setActionLoading(true)
    try {
      await apiService.post('/bookings/', form)
      await fetchBookings()
      setView('list')
    } catch (err: any) {
      alert(err?.message || 'Failed to create booking')
    } finally {
      setActionLoading(false)
    }
  }

  /* delete booking */
  const handleDelete = async (id: number) => {
    setActionLoading(true)
    try {
      await apiService.delete(`/bookings/${id}/`)
      await fetchBookings()
      setDeleteConfirm(null)
      if (view === 'detail') setView('list')
    } catch (err: any) {
      alert(err?.message || 'Failed to delete booking')
    } finally {
      setActionLoading(false)
    }
  }

  /* quick status update */
  const handleStatusChange = async (id: number, status: string) => {
    try {
      await apiService.patch(`/bookings/${id}/`, { status })
      await fetchBookings()
      if (selected?.id === id) setSelected({ ...selected!, status })
    } catch (err: any) {
      alert(err?.message || 'Failed to update status')
    }
  }

  const countByStatus = (s: string) => bookings.filter((b) => b.status === s).length
  const totalRevenue = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + parseFloat(b.total_price || '0'), 0)

  /* ── RENDER ── */
  return (
    <div className='min-h-screen bg-gray-50'>

      {/* Navbar */}
      <nav className='bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            <Link href='/' className='font-bold text-blue-600 text-lg'>Abeliza</Link>
            <span className='text-gray-300'>|</span>
            <span className='text-sm font-medium text-gray-500'>Admin Portal</span>
          </div>
          <div className='flex items-center gap-4 text-sm text-gray-500'>
            <Link href='/admin/tracking' className='hover:text-blue-600 transition'>GPS Tracking</Link>
            <Link href='/admin/vendors' className='hover:text-blue-600 transition'>Vendors</Link>
            <Link href='/admin/bookings' className='text-blue-600 font-semibold'>Bookings</Link>
          </div>
        </div>
      </nav>

      <div className='max-w-7xl mx-auto px-6 py-8'>

        {/* ═══════════════ LIST VIEW ═══════════════ */}
        {view === 'list' && (
          <>
            {/* Header */}
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h1 className='text-2xl font-bold text-gray-900'>Bookings</h1>
                <p className='text-sm text-gray-400 mt-0.5'>{bookings.length} total bookings</p>
              </div>
              <button
                onClick={openCreate}
                className='bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition'
              >
                + New Booking
              </button>
            </div>

            {/* Stats */}
            <div className='grid grid-cols-2 md:grid-cols-5 gap-3 mb-6'>
              {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-xl p-4 text-left border transition ${
                    statusFilter === s
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <p className={`text-xl font-bold ${statusFilter === s ? 'text-blue-600' : 'text-gray-800'}`}>
                    {s === 'all' ? bookings.length : countByStatus(s)}
                  </p>
                  <p className='text-xs text-gray-500 capitalize mt-0.5'>{s === 'all' ? 'All' : s}</p>
                </button>
              ))}
            </div>

            {/* Revenue card */}
            <div className='bg-green-50 border border-green-100 rounded-2xl p-5 mb-6'>
              <p className='text-xs text-green-600 font-medium'>Total Revenue (Completed)</p>
              <p className='text-3xl font-bold text-green-700 mt-1'>OMR {totalRevenue.toFixed(2)}</p>
            </div>

            {/* Search */}
            <div className='mb-4'>
              <input
                type='text'
                placeholder='Search by customer, car, booking ID, passport, phone...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>

            {/* Table */}
            <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
              {loading ? (
                <div className='py-16 text-center text-gray-400'>Loading bookings...</div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead className='bg-gray-50 text-gray-500 text-xs uppercase'>
                      <tr>
                        <th className='px-4 py-3 text-left'>ID</th>
                        <th className='px-4 py-3 text-left'>Customer</th>
                        <th className='px-4 py-3 text-left'>Car</th>
                        <th className='px-4 py-3 text-left'>Pickup</th>
                        <th className='px-4 py-3 text-left'>Return</th>
                        <th className='px-4 py-3 text-right'>Amount</th>
                        <th className='px-4 py-3 text-left'>Status</th>
                        <th className='px-4 py-3 text-left'>Payment</th>
                        <th className='px-4 py-3 text-left'>Actions</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-50'>
                      {filtered.map((b) => (
                        <tr key={b.id} className='hover:bg-gray-50 transition'>
                          <td className='px-4 py-3 text-gray-400 font-mono'>#{b.id}</td>
                          <td className='px-4 py-3'>
                            <p className='font-medium text-gray-800'>{b.username}</p>
                            <p className='text-xs text-gray-400'>{b.gsm}</p>
                          </td>
                          <td className='px-4 py-3'>
                            <p className='font-medium text-gray-700'>{b.car_name}</p>
                            <p className='text-xs text-gray-400'>{b.car_brand}</p>
                          </td>
                          <td className='px-4 py-3 text-gray-500 text-xs'>{b.pickup_date}</td>
                          <td className='px-4 py-3 text-gray-500 text-xs'>{b.return_date}</td>
                          <td className='px-4 py-3 text-right font-semibold text-gray-800'>
                            OMR {b.total_price}
                          </td>
                          <td className='px-4 py-3'>
                            <select
                              value={b.status}
                              onChange={(e) => handleStatusChange(b.id, e.target.value)}
                              className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-500'}`}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td className='px-4 py-3'>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_COLORS[b.payment_status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {b.payment_status}
                            </span>
                          </td>
                          <td className='px-4 py-3'>
                            <div className='flex items-center gap-2'>
                              <button
                                onClick={() => openDetail(b)}
                                className='text-xs text-blue-600 hover:underline'
                              >
                                View
                              </button>
                              <span className='text-gray-300'>|</span>
                              <button
                                onClick={() => openEdit(b)}
                                className='text-xs text-gray-500 hover:underline'
                              >
                                Edit
                              </button>
                              <span className='text-gray-300'>|</span>
                              <button
                                onClick={() => setDeleteConfirm(b.id)}
                                className='text-xs text-red-400 hover:underline'
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filtered.length && (
                        <tr>
                          <td colSpan={9} className='px-4 py-12 text-center text-gray-400'>
                            <p className='text-3xl mb-2'>📋</p>
                            <p>No bookings found</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════ DETAIL VIEW ═══════════════ */}
        {view === 'detail' && selected && (
          <>
            <div className='flex items-center gap-4 mb-6'>
              <button
                onClick={() => setView('list')}
                className='text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1'
              >
                ← Back
              </button>
              <h1 className='text-xl font-bold text-gray-900'>Booking #{selected.id}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[selected.status]}`}>
                {selected.status}
              </span>
              <div className='ml-auto flex gap-3'>
                <button
                  onClick={() => openEdit(selected)}
                  className='bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-200 transition'
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(selected.id)}
                  className='bg-red-50 text-red-600 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-100 transition'
                >
                  Delete
                </button>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>

              {/* Car info */}
              <DetailCard title='Car'>
                {selected.car_image && (
                  <img
                    src={selected.car_image}
                    alt={selected.car_name}
                    className='w-full h-40 object-cover rounded-xl mb-4'
                  />
                )}
                <DetailRow label='Name' value={selected.car_name} />
                <DetailRow label='Brand' value={selected.car_brand} />
                <DetailRow label='Car ID' value={String(selected.car)} />
              </DetailCard>

              {/* Trip info */}
              <DetailCard title='Trip Details'>
                <DetailRow label='Pickup Date' value={selected.pickup_date} />
                <DetailRow label='Return Date' value={selected.return_date} />
                <DetailRow label='Pickup Location' value={selected.pickup_location} />
                <DetailRow label='Dropoff Location' value={selected.dropoff_location} />
                <DetailRow label='Total Price' value={`OMR ${selected.total_price}`} highlight />
              </DetailCard>

              {/* Customer info */}
              <DetailCard title='Customer'>
                <DetailRow label='Username' value={selected.username} />
                <DetailRow label='GSM' value={selected.gsm ?? '—'} />
                <DetailRow label='Email' value={selected.email ?? '—'} />
                <DetailRow label='Address' value={selected.address ?? '—'} />
                <DetailRow label='Nationality' value={selected.nationality ?? '—'} />
                <DetailRow label='Date of Birth' value={selected.date_birth ?? '—'} />
              </DetailCard>

              {/* Documents */}
              <DetailCard title='Documents & Status'>
                <DetailRow label='Passport No' value={selected.passport_no ?? '—'} />
                <DetailRow label='Driving License' value={selected.driving_license_no ?? '—'} />
                <DetailRow label='Issued At' value={selected.issued_at ?? '—'} />
                <DetailRow label='Status' value={selected.status} />
                <DetailRow label='Payment' value={selected.payment_status} />
                <DetailRow label='Booked At' value={new Date(selected.created_at).toLocaleString()} />
              </DetailCard>

            </div>

            {/* Quick status actions */}
            <div className='bg-white rounded-2xl border border-gray-100 p-6 mt-6'>
              <h3 className='font-semibold text-gray-800 mb-4'>Quick Actions</h3>
              <div className='flex flex-wrap gap-3'>
                {STATUS_OPTIONS.filter((s) => s !== selected.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selected.id, s)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition capitalize ${STATUS_COLORS[s]} hover:opacity-80`}
                  >
                    Mark as {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ EDIT VIEW ═══════════════ */}
        {(view === 'edit' || view === 'create') && (
          <>
            <div className='flex items-center gap-4 mb-6'>
              <button
                onClick={() => setView(selected ? 'detail' : 'list')}
                className='text-gray-400 hover:text-gray-600 text-sm'
              >
                ← Back
              </button>
              <h1 className='text-xl font-bold text-gray-900'>
                {view === 'create' ? 'New Booking' : `Edit Booking #${selected?.id}`}
              </h1>
            </div>

            <div className='bg-white rounded-2xl border border-gray-100 p-8 max-w-3xl'>
              <div className='space-y-6'>

                <FormSection title='Car & Trip'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Car</label>
                      <select
                        value={form.car}
                        onChange={(e) => setForm({ ...form, car: e.target.value })}
                        className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
                      >
                        <option value=''>Select a car</option>
                        {cars.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <FormField label='Pickup Date' value={form.pickup_date} type='date' onChange={(v) => setForm({ ...form, pickup_date: v })} />
                    <FormField label='Return Date' value={form.return_date} type='date' onChange={(v) => setForm({ ...form, return_date: v })} />
                    <FormField label='Pickup Location' value={form.pickup_location} onChange={(v) => setForm({ ...form, pickup_location: v })} />
                    <FormField label='Dropoff Location' value={form.dropoff_location} onChange={(v) => setForm({ ...form, dropoff_location: v })} />
                    <FormField label='Total Price' value={form.total_price} type='number' onChange={(v) => setForm({ ...form, total_price: v })} />
                  </div>
                </FormSection>

                <FormSection title='Status'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Booking Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Payment Status</label>
                      <select
                        value={form.payment_status}
                        onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
                        className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
                      >
                        {PAYMENT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </FormSection>

                <FormSection title='Customer Details'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FormField label='GSM' value={form.gsm} onChange={(v) => setForm({ ...form, gsm: v })} />
                    <FormField label='Nationality' value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
                    <FormField label='Date of Birth' value={form.date_birth} type='date' onChange={(v) => setForm({ ...form, date_birth: v })} />
                    <FormField label='Address' value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                  </div>
                </FormSection>

                <FormSection title='Documents'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FormField label='Passport No' value={form.passport_no} onChange={(v) => setForm({ ...form, passport_no: v })} />
                    <FormField label='Driving License No' value={form.driving_license_no} onChange={(v) => setForm({ ...form, driving_license_no: v })} />
                    <FormField label='Issued At' value={form.issued_at} onChange={(v) => setForm({ ...form, issued_at: v })} />
                  </div>
                </FormSection>

              </div>

              <div className='flex justify-between mt-8 pt-6 border-t border-gray-100'>
                <button
                  onClick={() => setView(selected ? 'detail' : 'list')}
                  className='px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition'
                >
                  Cancel
                </button>
                <button
                  onClick={view === 'create' ? handleCreate : handleSave}
                  disabled={actionLoading}
                  className='px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 flex items-center gap-2'
                >
                  {actionLoading ? (
                    <>
                      <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                      Saving...
                    </>
                  ) : (
                    view === 'create' ? 'Create Booking' : 'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm !== null && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6'>
            <h2 className='text-lg font-bold text-gray-900 mb-2'>Delete Booking</h2>
            <p className='text-sm text-gray-500 mb-6'>
              Are you sure you want to delete booking <span className='font-semibold'>#{deleteConfirm}</span>?
              This action cannot be undone.
            </p>
            <div className='flex gap-3'>
              <button
                onClick={() => setDeleteConfirm(null)}
                className='flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition'
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading}
                className='flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60'
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Reusable components ──────────────────────────────── */
const DetailCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
    <div className='bg-gray-50 px-5 py-3 border-b border-gray-100'>
      <h3 className='text-sm font-semibold text-gray-600 uppercase tracking-wide'>{title}</h3>
    </div>
    <div className='p-5 space-y-3'>{children}</div>
  </div>
)

const DetailRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className='flex justify-between items-center text-sm'>
    <span className='text-gray-400'>{label}</span>
    <span className={`font-medium ${highlight ? 'text-green-600 text-base font-bold' : 'text-gray-800'}`}>
      {value}
    </span>
  </div>
)

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className='text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100'>
      {title}
    </h3>
    {children}
  </div>
)

const FormField = ({
  label, value, onChange, type = 'text'
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) => (
  <div>
    <label className='block text-sm font-medium text-gray-700 mb-1'>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
    />
  </div>
)