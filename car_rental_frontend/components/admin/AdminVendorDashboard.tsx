'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import apiService from '@/app/services/apiService'

interface Vendor {
  id: number
  business_name: string
  user_email: string
  user_name: string
  phone_number: string
  city: string
  country: string
  commission_rate: number
  status: string
  total_earnings: number
  total_commission: number
  total_bookings: number
  total_cars: number
  created_at: string
}

interface CommissionSummary {
  total_revenue: number
  total_commission_earned: number
  total_vendor_payout: number
  pending_payout: number
  total_vendors: number
  approved_vendors: number
  pending_vendors: number
}

type Filter = 'all' | 'pending' | 'approved' | 'suspended' | 'rejected'

export default function AdminVendorDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [allVendors, setAllVendors] = useState<Vendor[]>([]) // unfiltered for counts
  const [summary, setSummary] = useState<CommissionSummary | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [commissionEdit, setCommissionEdit] = useState<Record<number, string>>({})

  const fetchVendors = useCallback(async (f: Filter = 'all') => {
    try {
      const url = f === 'all'
        ? '/vendors/admin/vendors/'
        : `/vendors/admin/vendors/?status=${f}`
      const data = await apiService.get(url)
      const list = Array.isArray(data) ? data : []
      setVendors(list)
      if (f === 'all') setAllVendors(list)
    } catch (err) {
      console.error('Failed to load vendors:', err)
      setVendors([])
    }
  }, [])

  const fetchSummary = useCallback(async () => {
    try {
      const data = await apiService.get('/vendors/admin/vendors/commission-summary/')
      console.log('Summary data:', data)
      setSummary(data)
    } catch (err) {
      console.error('Failed to load summary:', err)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchVendors('all'), fetchSummary()])
      setLoading(false)
    }
    load()
  }, [fetchVendors, fetchSummary])

  const handleFilterChange = (f: Filter) => {
    setFilter(f)
    if (f === 'all') {
      setVendors(allVendors)
    } else {
      setVendors(allVendors.filter((v) => v.status === f))
    }
  }

  const handleApprove = async (id: number) => {
    setActionLoading(true)
    try {
      await apiService.post(`/vendors/admin/vendors/${id}/approve/`, {})
      await fetchVendors('all')
      await fetchSummary()
      setSelectedVendor(null)
    } catch (err: any) {
      alert(err?.message || 'Failed to approve vendor')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (id: number) => {
    setActionLoading(true)
    try {
      await apiService.post(`/vendors/admin/vendors/${id}/reject/`, { reason: rejectReason })
      await fetchVendors('all')
      await fetchSummary()
      setSelectedVendor(null)
      setRejectReason('')
    } catch (err: any) {
      alert(err?.message || 'Failed to reject vendor')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspend = async (id: number) => {
    if (!confirm('Are you sure you want to suspend this vendor?')) return
    setActionLoading(true)
    try {
      await apiService.post(`/vendors/admin/vendors/${id}/suspend/`, {})
      await fetchVendors('all')
      await fetchSummary()
      setSelectedVendor(null)
    } catch (err: any) {
      alert(err?.message || 'Failed to suspend vendor')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateCommission = async (id: number) => {
    const rate = commissionEdit[id]
    if (!rate) return
    try {
      await apiService.patch(`/vendors/admin/vendors/${id}/`, { commission_rate: rate })
      await fetchVendors('all')
      setCommissionEdit((prev) => { const n = { ...prev }; delete n[id]; return n })
    } catch (err: any) {
      alert(err?.message || 'Failed to update commission')
    }
  }

  // Count per status from allVendors
  const countByStatus = (s: string) => allVendors.filter((v) => v.status === s).length

  const statusColor: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    suspended: 'bg-red-100 text-red-600',
    rejected: 'bg-gray-100 text-gray-500',
  }

  if (loading) return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <p className='text-gray-400'>Loading vendor dashboard...</p>
    </div>
  )

  return (
    <div className='min-h-screen bg-gray-50'>

      {/* ── Admin Navbar ── */}
      <nav className='bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            <Link href='/' className='font-bold text-blue-600 text-lg'>Abeliza</Link>
            <span className='text-gray-300'>|</span>
            <span className='text-sm font-medium text-gray-500'>Admin Portal</span>
          </div>
          <div className='flex items-center gap-4 text-sm text-gray-500'>
            <Link href='/admin/tracking' className='hover:text-blue-600 transition'>GPS Tracking</Link>
            <Link href='/admin/vendors' className='text-blue-600 font-semibold'>Vendors</Link>
            <Link href='/admin/bookings' className='hover:text-blue-600 transition'>Bookings</Link>
          </div>
        </div>
      </nav>

      <div className='max-w-7xl mx-auto px-6 py-8'>

        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-gray-900'>Vendor Management</h1>
          <p className='text-sm text-gray-400 mt-1'>Manage vendor applications, commissions and payouts</p>
        </div>

        {/* ── Summary Cards ── */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
          <SummaryCard
            label='Total Revenue'
            value={`OMR ${(summary?.total_revenue ?? 0).toFixed(2)}`}
            sub={`${allVendors.length} total vendors`}
            color='blue'
            icon='💰'
          />
          <SummaryCard
            label='Commission Earned'
            value={`OMR ${(summary?.total_commission_earned ?? 0).toFixed(2)}`}
            sub='Platform earnings'
            color='green'
            icon='📈'
          />
          <SummaryCard
            label='Pending Payouts'
            value={`OMR ${(summary?.pending_payout ?? 0).toFixed(2)}`}
            sub='Awaiting payment'
            color='yellow'
            icon='⏳'
          />
          <SummaryCard
            label='Vendor Payout'
            value={`OMR ${(summary?.total_vendor_payout ?? 0).toFixed(2)}`}
            sub='Paid to vendors'
            color='purple'
            icon='🏦'
          />
        </div>

        {/* ── Status overview ── */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>
          {(['all', 'pending', 'approved', 'suspended'] as Filter[]).map((f) => {
            const count = f === 'all' ? allVendors.length : countByStatus(f)
            const active = filter === f
            return (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`rounded-xl p-4 text-left transition border ${
                  active
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <p className={`text-2xl font-bold ${active ? 'text-blue-600' : 'text-gray-800'}`}>
                  {count}
                </p>
                <p className='text-xs text-gray-500 capitalize mt-0.5'>{f === 'all' ? 'All Vendors' : `${f} Vendors`}</p>
                {f === 'pending' && count > 0 && (
                  <span className='text-xs text-yellow-600 font-medium'>⚠ Needs review</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Pending alert ── */}
        {countByStatus('pending') > 0 && (
          <div
            className='bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-700 cursor-pointer hover:bg-yellow-100 transition flex items-center justify-between'
            onClick={() => handleFilterChange('pending')}
          >
            <span>
              ⚠️ <span className='font-semibold'>{countByStatus('pending')} vendor application{countByStatus('pending') > 1 ? 's' : ''}</span> awaiting your approval
            </span>
            <span className='text-yellow-600 font-medium'>Review →</span>
          </div>
        )}

        {/* ── Filter tabs ── */}
        <div className='flex gap-1 bg-gray-100 p-1 rounded-xl mb-4 w-fit'>
          {(['all', 'pending', 'approved', 'suspended', 'rejected'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
              {f !== 'all' && (
                <span className='ml-1.5 text-xs text-gray-400'>({countByStatus(f)})</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Vendor table ── */}
        <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50 text-gray-500 text-xs uppercase'>
                <tr>
                  <th className='px-4 py-3 text-left'>Vendor</th>
                  <th className='px-4 py-3 text-left'>Contact</th>
                  <th className='px-4 py-3 text-left'>Location</th>
                  <th className='px-4 py-3 text-center'>Cars</th>
                  <th className='px-4 py-3 text-center'>Bookings</th>
                  <th className='px-4 py-3 text-right'>Earnings</th>
                  <th className='px-4 py-3 text-center'>Commission %</th>
                  <th className='px-4 py-3 text-left'>Status</th>
                  <th className='px-4 py-3 text-left'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-50'>
                {vendors.map((v) => (
                  <tr key={v.id} className='hover:bg-gray-50 transition'>
                    <td className='px-4 py-3'>
                      <p className='font-semibold text-gray-800'>{v.business_name}</p>
                      <p className='text-xs text-gray-400'>{v.user_name}</p>
                    </td>
                    <td className='px-4 py-3 text-gray-500'>
                      <p>{v.user_email}</p>
                      <p className='text-xs'>{v.phone_number}</p>
                    </td>
                    <td className='px-4 py-3 text-gray-500 text-xs'>{v.city}, {v.country}</td>
                    <td className='px-4 py-3 text-center text-gray-700 font-medium'>{v.total_cars}</td>
                    <td className='px-4 py-3 text-center text-gray-700 font-medium'>{v.total_bookings}</td>
                    <td className='px-4 py-3 text-right font-semibold text-green-600'>
                      OMR {(v.total_earnings ?? 0).toFixed(2)}
                    </td>
                    <td className='px-4 py-3 text-center'>
                      <div className='flex items-center justify-center gap-1'>
                        <input
                          type='number'
                          min='0'
                          max='100'
                          value={commissionEdit[v.id] ?? v.commission_rate}
                          onChange={(e) =>
                            setCommissionEdit({ ...commissionEdit, [v.id]: e.target.value })
                          }
                          className='w-14 text-center border border-gray-200 rounded-lg px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500'
                        />
                        {commissionEdit[v.id] !== undefined && commissionEdit[v.id] !== String(v.commission_rate) && (
                          <button
                            onClick={() => handleUpdateCommission(v.id)}
                            className='text-xs text-blue-600 hover:underline whitespace-nowrap'
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[v.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <button
                        onClick={() => setSelectedVendor(v)}
                        className='text-xs text-blue-600 hover:underline font-medium'
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {!vendors.length && (
                  <tr>
                    <td colSpan={9} className='px-4 py-12 text-center text-gray-400'>
                      <p className='text-3xl mb-2'>🏪</p>
                      <p>No {filter === 'all' ? '' : filter} vendors found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Vendor detail modal ── */}
      {selectedVendor && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl w-full max-w-md shadow-2xl'>
            <div className='p-6 border-b border-gray-100'>
              <div className='flex justify-between items-start'>
                <div>
                  <h2 className='text-lg font-bold text-gray-900'>{selectedVendor.business_name}</h2>
                  <p className='text-sm text-gray-400 mt-0.5'>{selectedVendor.user_email}</p>
                </div>
                <button
                  onClick={() => { setSelectedVendor(null); setRejectReason('') }}
                  className='text-gray-400 hover:text-gray-600 text-2xl leading-none'
                >
                  ×
                </button>
              </div>
            </div>

            <div className='p-6 space-y-3 text-sm'>
              <InfoRow label='Owner' value={selectedVendor.user_name} />
              <InfoRow label='Phone' value={selectedVendor.phone_number} />
              <InfoRow label='Location' value={`${selectedVendor.city}, ${selectedVendor.country}`} />
              <InfoRow label='Commission' value={`${selectedVendor.commission_rate}%`} />
              <InfoRow label='Status' value={selectedVendor.status} />
              <InfoRow label='Total Cars' value={String(selectedVendor.total_cars)} />
              <InfoRow label='Total Bookings' value={String(selectedVendor.total_bookings)} />
              <InfoRow label='Total Earnings' value={`OMR ${(selectedVendor.total_earnings ?? 0).toFixed(2)}`} />
              <InfoRow label='Applied' value={new Date(selectedVendor.created_at).toLocaleDateString()} />

              {selectedVendor.status === 'pending' && (
                <div className='pt-2'>
                  <label className='text-xs text-gray-500 block mb-1'>Rejection reason (optional)</label>
                  <input
                    type='text'
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder='e.g. Documents incomplete'
                    className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400'
                  />
                </div>
              )}
            </div>

            <div className='p-6 pt-0 flex gap-3 flex-wrap'>
              {selectedVendor.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApprove(selectedVendor.id)}
                    disabled={actionLoading}
                    className='flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 transition disabled:opacity-60'
                  >
                    {actionLoading ? '...' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(selectedVendor.id)}
                    disabled={actionLoading}
                    className='flex-1 bg-red-50 text-red-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-red-100 transition disabled:opacity-60'
                  >
                    {actionLoading ? '...' : '✗ Reject'}
                  </button>
                </>
              )}
              {selectedVendor.status === 'approved' && (
                <button
                  onClick={() => handleSuspend(selectedVendor.id)}
                  disabled={actionLoading}
                  className='flex-1 bg-red-50 text-red-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-red-100 transition disabled:opacity-60'
                >
                  {actionLoading ? '...' : '⛔ Suspend Vendor'}
                </button>
              )}
              {selectedVendor.status === 'suspended' && (
                <button
                  onClick={() => handleApprove(selectedVendor.id)}
                  disabled={actionLoading}
                  className='flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 transition disabled:opacity-60'
                >
                  {actionLoading ? '...' : '✓ Reinstate Vendor'}
                </button>
              )}
              {selectedVendor.status === 'rejected' && (
                <button
                  onClick={() => handleApprove(selectedVendor.id)}
                  disabled={actionLoading}
                  className='flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 transition disabled:opacity-60'
                >
                  {actionLoading ? '...' : '✓ Approve Anyway'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const SummaryCard = ({
  label, value, sub, color, icon
}: {
  label: string; value: string; sub: string; color: string; icon: string
}) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  }
  return (
    <div className={`rounded-2xl p-5 border ${colors[color]}`}>
      <div className='flex items-center justify-between mb-2'>
        <p className='text-xs font-medium opacity-70'>{label}</p>
        <span className='text-lg'>{icon}</span>
      </div>
      <p className='text-2xl font-bold'>{value}</p>
      <p className='text-xs opacity-60 mt-1'>{sub}</p>
    </div>
  )
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className='flex justify-between items-center'>
    <span className='text-gray-400'>{label}</span>
    <span className='font-medium text-gray-800 capitalize'>{value}</span>
  </div>
)






// 'use client'

// import { useEffect, useState } from 'react'
// import apiService from '@/app/services/apiService'

// interface Vendor {
//   id: number
//   business_name: string
//   user_email: string
//   user_name: string
//   phone_number: string
//   city: string
//   country: string
//   commission_rate: number
//   status: string
//   total_earnings: number
//   total_commission: number
//   total_bookings: number
//   total_cars: number
//   created_at: string
// }

// interface CommissionSummary {
//   total_revenue: number
//   total_commission_earned: number
//   total_vendor_payout: number
//   pending_payout: number
//   total_vendors: number
//   approved_vendors: number
//   pending_vendors: number
// }

// type Filter = 'all' | 'pending' | 'approved' | 'suspended' | 'rejected'

// export default function AdminVendorDashboard() {
//   const [vendors, setVendors] = useState<Vendor[]>([])
//   const [summary, setSummary] = useState<CommissionSummary | null>(null)
//   const [filter, setFilter] = useState<Filter>('all')
//   const [loading, setLoading] = useState(true)
//   const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
//   const [rejectReason, setRejectReason] = useState('')
//   const [actionLoading, setActionLoading] = useState(false)
//   const [commissionEdit, setCommissionEdit] = useState<Record<number, string>>({})

//   const fetchVendors = async (f: Filter = filter) => {
//     try {
//       const url = f === 'all' ? '/vendors/admin/vendors/' : `/vendors/admin/vendors/?status=${f}`
//       const data = await apiService.get(url)
//       setVendors(Array.isArray(data) ? data : [])
//     } catch (err) {
//       console.error('Failed to load vendors:', err)
//     }
//   }

//   const fetchSummary = async () => {
//     try {
//       const data = await apiService.get('/vendors/admin/vendors/commission-summary/')
//       setSummary(data)
//     } catch (err) {
//       console.error('Failed to load summary:', err)
//     }
//   }

//   useEffect(() => {
//     const load = async () => {
//       setLoading(true)
//       await Promise.all([fetchVendors('all'), fetchSummary()])
//       setLoading(false)
//     }
//     load()
//   }, [])

//   const handleFilterChange = (f: Filter) => {
//     setFilter(f)
//     fetchVendors(f)
//   }

//   const handleApprove = async (id: number) => {
//     setActionLoading(true)
//     try {
//       await apiService.post(`/vendors/admin/vendors/${id}/approve/`, {})
//       await fetchVendors()
//       await fetchSummary()
//       setSelectedVendor(null)
//     } catch (err: any) {
//       alert(err?.message || 'Failed to approve vendor')
//     } finally {
//       setActionLoading(false)
//     }
//   }

//   const handleReject = async (id: number) => {
//     setActionLoading(true)
//     try {
//       await apiService.post(`/vendors/admin/vendors/${id}/reject/`, { reason: rejectReason })
//       await fetchVendors()
//       setSelectedVendor(null)
//       setRejectReason('')
//     } catch (err: any) {
//       alert(err?.message || 'Failed to reject vendor')
//     } finally {
//       setActionLoading(false)
//     }
//   }

//   const handleSuspend = async (id: number) => {
//     if (!confirm('Are you sure you want to suspend this vendor?')) return
//     setActionLoading(true)
//     try {
//       await apiService.post(`/vendors/admin/vendors/${id}/suspend/`, {})
//       await fetchVendors()
//       setSelectedVendor(null)
//     } catch (err: any) {
//       alert(err?.message || 'Failed to suspend vendor')
//     } finally {
//       setActionLoading(false)
//     }
//   }

//   const handleUpdateCommission = async (id: number) => {
//     const rate = commissionEdit[id]
//     if (!rate) return
//     try {
//       await apiService.patch(`/vendors/admin/vendors/${id}/`, { commission_rate: rate })
//       await fetchVendors()
//       setCommissionEdit((prev) => { const n = { ...prev }; delete n[id]; return n })
//     } catch (err: any) {
//       alert(err?.message || 'Failed to update commission')
//     }
//   }

//   const statusColor: Record<string, string> = {
//     approved: 'bg-green-100 text-green-700',
//     pending: 'bg-yellow-100 text-yellow-700',
//     suspended: 'bg-red-100 text-red-600',
//     rejected: 'bg-gray-100 text-gray-500',
//   }

//   if (loading) return (
//     <div className='min-h-screen flex items-center justify-center bg-gray-50'>
//       <div className='text-gray-400'>Loading vendor dashboard...</div>
//     </div>
//   )

//   return (
//     <div className='min-h-screen bg-gray-50'>

//       {/* Header */}
//       <div className='bg-white border-b border-gray-100 px-6 py-5'>
//         <div className='max-w-7xl mx-auto'>
//           <h1 className='text-xl font-bold text-gray-900'>Vendor Management</h1>
//           <p className='text-sm text-gray-400 mt-0.5'>Manage vendor applications, commissions and payouts</p>
//         </div>
//       </div>

//       <div className='max-w-7xl mx-auto px-6 py-8'>

//         {/* Commission Summary */}
//         {summary && (
//           <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
//             <SummaryCard label='Total Revenue' value={`$${(summary?.total_revenue || 0).toFixed(2)}`} color='blue' />
//             <SummaryCard label='Commission Earned' value={`$${(summary?.total_commission_earned || 0).toFixed(2)}`} color='green' />
//             <SummaryCard label='Pending Payouts' value={`$${(summary?.pending_payout || 0).toFixed(2)}`} color='yellow' />
//             <SummaryCard label='Approved Vendors' value={`${summary.approved_vendors || 0} / ${summary.total_vendors || 0}`} color='purple' />
//           </div>
//         )}
//         {/* Pending alert */}
//         {summary && summary.pending_vendors > 0 && (
//           <div
//             className='bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-700 cursor-pointer hover:bg-yellow-100 transition'
//             onClick={() => handleFilterChange('pending')}
//           >
//             ⚠️ <span className='font-semibold'>{summary.pending_vendors} vendor application{summary.pending_vendors > 1 ? 's' : ''}</span> awaiting approval — click to review
//           </div>
//         )}

//         {/* Filter tabs */}
//         <div className='flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit'>
//           {(['all', 'pending', 'approved', 'suspended', 'rejected'] as Filter[]).map((f) => (
//             <button
//               key={f}
//               onClick={() => handleFilterChange(f)}
//               className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
//                 filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
//               }`}
//             >
//               {f}
//             </button>
//           ))}
//         </div>

//         {/* Vendor table */}
//         <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
//           <div className='overflow-x-auto'>
//             <table className='w-full text-sm'>
//               <thead className='bg-gray-50 text-gray-500 text-xs uppercase'>
//                 <tr>
//                   <th className='px-4 py-3 text-left'>Vendor</th>
//                   <th className='px-4 py-3 text-left'>Contact</th>
//                   <th className='px-4 py-3 text-left'>Location</th>
//                   <th className='px-4 py-3 text-center'>Cars</th>
//                   <th className='px-4 py-3 text-center'>Bookings</th>
//                   <th className='px-4 py-3 text-right'>Earnings</th>
//                   <th className='px-4 py-3 text-center'>Commission %</th>
//                   <th className='px-4 py-3 text-left'>Status</th>
//                   <th className='px-4 py-3 text-left'>Actions</th>
//                 </tr>
//               </thead>
//               <tbody className='divide-y divide-gray-50'>
//                 {vendors.map((v) => (
//                   <tr key={v.id} className='hover:bg-gray-50'>
//                     <td className='px-4 py-3'>
//                       <p className='font-semibold text-gray-800'>{v.business_name}</p>
//                       <p className='text-xs text-gray-400'>{v.user_name}</p>
//                     </td>
//                     <td className='px-4 py-3 text-gray-500'>
//                       <p>{v.user_email}</p>
//                       <p className='text-xs'>{v.phone_number}</p>
//                     </td>
//                     <td className='px-4 py-3 text-gray-500'>{v.city}, {v.country}</td>
//                     <td className='px-4 py-3 text-center text-gray-700'>{v.total_cars}</td>
//                     <td className='px-4 py-3 text-center text-gray-700'>{v.total_bookings}</td>
//                     <td className='px-4 py-3 text-right font-semibold text-green-600'>
//                       ${v.total_earnings.toFixed(2)}
//                     </td>

//                     {/* Commission edit inline */}
//                     <td className='px-4 py-3 text-center'>
//                       <div className='flex items-center justify-center gap-1'>
//                         <input
//                           type='number'
//                           min='0'
//                           max='100'
//                           value={commissionEdit[v.id] ?? v.commission_rate}
//                           onChange={(e) => setCommissionEdit({ ...commissionEdit, [v.id]: e.target.value })}
//                           className='w-14 text-center border border-gray-200 rounded-lg px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500'
//                         />
//                         {commissionEdit[v.id] && (
//                           <button
//                             onClick={() => handleUpdateCommission(v.id)}
//                             className='text-xs text-blue-600 hover:underline'
//                           >
//                             Save
//                           </button>
//                         )}
//                       </div>
//                     </td>

//                     <td className='px-4 py-3'>
//                       <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[v.status]}`}>
//                         {v.status}
//                       </span>
//                     </td>

//                     <td className='px-4 py-3'>
//                       <button
//                         onClick={() => setSelectedVendor(v)}
//                         className='text-xs text-blue-600 hover:underline'
//                       >
//                         Manage
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//                 {!vendors.length && (
//                   <tr>
//                     <td colSpan={9} className='px-4 py-10 text-center text-gray-400'>
//                       No vendors found
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       {/* Vendor detail modal */}
//       {selectedVendor && (
//         <div className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4'>
//           <div className='bg-white rounded-2xl w-full max-w-md shadow-xl'>
//             <div className='p-6 border-b border-gray-100'>
//               <div className='flex justify-between items-start'>
//                 <div>
//                   <h2 className='text-lg font-bold text-gray-900'>{selectedVendor.business_name}</h2>
//                   <p className='text-sm text-gray-400'>{selectedVendor.user_email}</p>
//                 </div>
//                 <button onClick={() => setSelectedVendor(null)} className='text-gray-400 hover:text-gray-600 text-xl'>×</button>
//               </div>
//             </div>

//             <div className='p-6 space-y-3 text-sm'>
//               <InfoRow label='Owner' value={selectedVendor.user_name} />
//               <InfoRow label='Phone' value={selectedVendor.phone_number} />
//               <InfoRow label='Location' value={`${selectedVendor.city}, ${selectedVendor.country}`} />
//               <InfoRow label='Commission' value={`${selectedVendor.commission_rate}%`} />
//               <InfoRow label='Status' value={selectedVendor.status} />
//               <InfoRow label='Total Cars' value={String(selectedVendor.total_cars)} />
//               <InfoRow label='Total Bookings' value={String(selectedVendor.total_bookings)} />
//               <InfoRow label='Applied' value={new Date(selectedVendor.created_at).toLocaleDateString()} />

//               {/* Reject reason input */}
//               {selectedVendor.status === 'pending' && (
//                 <div className='pt-2'>
//                   <label className='text-xs text-gray-500 block mb-1'>Rejection reason (if rejecting)</label>
//                   <input
//                     type='text'
//                     value={rejectReason}
//                     onChange={(e) => setRejectReason(e.target.value)}
//                     placeholder='Optional reason...'
//                     className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400'
//                   />
//                 </div>
//               )}
//             </div>

//             {/* Action buttons */}
//             <div className='p-6 pt-0 flex gap-3 flex-wrap'>
//               {selectedVendor.status === 'pending' && (
//                 <>
//                   <button
//                     onClick={() => handleApprove(selectedVendor.id)}
//                     disabled={actionLoading}
//                     className='flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 transition disabled:opacity-60'
//                   >
//                     {actionLoading ? '...' : '✓ Approve'}
//                   </button>
//                   <button
//                     onClick={() => handleReject(selectedVendor.id)}
//                     disabled={actionLoading}
//                     className='flex-1 bg-red-50 text-red-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-red-100 transition disabled:opacity-60'
//                   >
//                     {actionLoading ? '...' : '✗ Reject'}
//                   </button>
//                 </>
//               )}
//               {selectedVendor.status === 'approved' && (
//                 <button
//                   onClick={() => handleSuspend(selectedVendor.id)}
//                   disabled={actionLoading}
//                   className='flex-1 bg-red-50 text-red-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-red-100 transition disabled:opacity-60'
//                 >
//                   {actionLoading ? '...' : 'Suspend Vendor'}
//                 </button>
//               )}
//               {selectedVendor.status === 'suspended' && (
//                 <button
//                   onClick={() => handleApprove(selectedVendor.id)}
//                   disabled={actionLoading}
//                   className='flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 transition disabled:opacity-60'
//                 >
//                   {actionLoading ? '...' : 'Reinstate Vendor'}
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// const SummaryCard = ({ label, value, color }: { label: string; value: string; color: string }) => {
//   const colors: Record<string, string> = {
//     blue: 'bg-blue-50 text-blue-700',
//     green: 'bg-green-50 text-green-700',
//     yellow: 'bg-yellow-50 text-yellow-700',
//     purple: 'bg-purple-50 text-purple-700',
//   }
//   return (
//     <div className={`rounded-2xl p-5 ${colors[color]}`}>
//       <p className='text-xs font-medium opacity-70'>{label}</p>
//       <p className='text-2xl font-bold mt-1'>{value}</p>
//     </div>
//   )
// }

// const InfoRow = ({ label, value }: { label: string; value: string }) => (
//   <div className='flex justify-between'>
//     <span className='text-gray-400'>{label}</span>
//     <span className='font-medium text-gray-800 capitalize'>{value}</span>
//   </div>
// )