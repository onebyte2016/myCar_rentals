'use client'
import { useEffect, useState } from 'react'
import apiService from '@/app/services/apiService'

export default function AdminReportsPage() {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiService.get('/vendors/admin/vendors/commission-summary/')
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const cards = summary ? [
    { label: 'Total Revenue', value: `OMR ${Number(summary.total_revenue).toFixed(2)}`, color: 'bg-blue-50 text-blue-700', icon: '💰' },
    { label: 'Commission Earned', value: `OMR ${Number(summary.total_commission_earned).toFixed(2)}`, color: 'bg-green-50 text-green-700', icon: '📈' },
    { label: 'Vendor Payouts', value: `OMR ${Number(summary.total_vendor_payout).toFixed(2)}`, color: 'bg-purple-50 text-purple-700', icon: '🏦' },
    { label: 'Pending Payouts', value: `OMR ${Number(summary.pending_payout).toFixed(2)}`, color: 'bg-yellow-50 text-yellow-700', icon: '⏳' },
    { label: 'Total Vendors', value: String(summary.total_vendors), color: 'bg-orange-50 text-orange-700', icon: '🏪' },
    { label: 'Approved Vendors', value: String(summary.approved_vendors), color: 'bg-teal-50 text-teal-700', icon: '✅' },
  ] : []

  return (
    <div className='mt-3'>
      <h1 className='text-2xl font-bold text-navy-700 dark:text-white mb-6'>Reports</h1>

      {loading ? (
        <p className='text-gray-400'>Loading...</p>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
          {cards.map((card) => (
            <div key={card.label} className={`rounded-2xl p-6 border ${card.color}`}>
              <div className='flex items-center justify-between mb-2'>
                <p className='text-sm font-medium opacity-70'>{card.label}</p>
                <span className='text-2xl'>{card.icon}</span>
              </div>
              <p className='text-3xl font-bold'>{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}