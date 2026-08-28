'use client'

import { useEffect, useState } from 'react'
import apiService from '@/app/services/apiService'

interface Payment {
  id: number
  reference: string
  booking: number
  amount: number
  currency: string
  method: string
  status: string
  created_at: string
}

interface Coupon {
  id: number
  code: string
  type: string
  value: number
  usage_limit: number | null
  times_used: number
  valid_until: string | null
  is_active: boolean
  min_booking_amount: number
  max_discount_amount: number | null
  usage_limit_per_user: number
}

type AdminTab = 'payments' | 'coupons' | 'pricing'

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-600',
  refunded: 'bg-gray-100 text-gray-600',
  processing: 'bg-blue-100 text-blue-700',
}

const METHOD_ICONS: Record<string, string> = {
  stripe: '💳',
  thawani: '🏦',
  flutterwave: '🌍',
  wallet: '👛',
  mobile_money: '📱',
  card: '💳',
  bank_transfer: '🏛',
}

const emptyRule = {
  name: '', type: 'weekend', multiplier: '1.00',
  start_date: '', end_date: '', min_days: '', advance_days: '',
  days_of_week: [] as number[], is_active: true, priority: '1',
}

export default function AdminPaymentsDashboard() {
  const [tab, setTab] = useState<AdminTab>('payments')
  const [payments, setPayments] = useState<Payment[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [pricingRules, setPricingRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [couponForm, setCouponForm] = useState({
    code: '', type: 'percentage', value: '', min_booking_amount: '0',
    max_discount_amount: '', usage_limit: '', usage_limit_per_user: '1',
    valid_from: '', valid_until: '', is_active: true,
  })
  const [ruleForm, setRuleForm] = useState(emptyRule)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [p, c, r] = await Promise.all([
          apiService.get('/payments/admin/payments/'),
          apiService.get('/payments/admin/coupons/'),
          apiService.get('/payments/admin/pricing-rules/'),
        ])
        setPayments(Array.isArray(p) ? p : [])
        setCoupons(Array.isArray(c) ? c : [])
        setPricingRules(Array.isArray(r) ? r : [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalRevenue = payments.filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)
  const completedCount = payments.filter(p => p.status === 'completed').length
  const failedCount = payments.filter(p => p.status === 'failed').length

  const handleCreateCoupon = async () => {
    setFormLoading(true)
    setFormError('')
    try {
      const payload: any = { ...couponForm }
      if (!payload.max_discount_amount) delete payload.max_discount_amount
      if (!payload.usage_limit) delete payload.usage_limit
      if (!payload.valid_until) delete payload.valid_until
      if (!payload.valid_from) delete payload.valid_from
      // datetime-local inputs give timezone-less local strings (e.g. "2026-08-06T14:30").
      // Convert to a real UTC ISO string so the server (TIME_ZONE=UTC) doesn't
      // misinterpret local wall-clock time as UTC and push valid_from into the future.
      if (payload.valid_from) payload.valid_from = new Date(payload.valid_from).toISOString()
      if (payload.valid_until) payload.valid_until = new Date(payload.valid_until).toISOString()
      const data = await apiService.post('/payments/admin/coupons/', payload)
      setCoupons([data, ...coupons])
      setShowCouponForm(false)
      setCouponForm({
        code: '', type: 'percentage', value: '', min_booking_amount: '0',
        max_discount_amount: '', usage_limit: '', usage_limit_per_user: '1',
        valid_from: '', valid_until: '', is_active: true,
      })
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create coupon')
    } finally {
      setFormLoading(false)
    }
  }

  const toggleCoupon = async (coupon: Coupon) => {
    try {
      await apiService.patch(`/payments/admin/coupons/${coupon.id}/`, { is_active: !coupon.is_active })
      setCoupons(coupons.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
    } catch (err) {
      console.error(err)
    }
  }

  const deleteCoupon = async (id: number) => {
    if (!confirm('Delete this coupon?')) return
    try {
      await apiService.delete(`/payments/admin/coupons/${id}/`)
      setCoupons(coupons.filter(c => c.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateRule = async () => {
    setFormLoading(true)
    setFormError('')
    try {
      const payload: any = { ...ruleForm }
      if (!payload.start_date) delete payload.start_date
      if (!payload.end_date) delete payload.end_date
      if (!payload.min_days) delete payload.min_days
      if (!payload.advance_days) delete payload.advance_days
      const data = await apiService.post('/payments/admin/pricing-rules/', payload)
      setPricingRules([data, ...pricingRules])
      setShowRuleForm(false)
      setRuleForm(emptyRule)
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create rule')
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-6 py-8'>
        <h1 className='text-2xl font-bold text-gray-900 mb-6'>Payment Management</h1>

        {/* Stats */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
          {[
            { label: 'Total Revenue', value: `OMR ${totalRevenue.toFixed(2)}`, color: 'bg-green-50 text-green-700', icon: '💰' },
            { label: 'Total Payments', value: String(payments.length), color: 'bg-blue-50 text-blue-700', icon: '📋' },
            { label: 'Completed', value: String(completedCount), color: 'bg-teal-50 text-teal-700', icon: '✅' },
            { label: 'Failed', value: String(failedCount), color: 'bg-red-50 text-red-600', icon: '❌' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-5 border ${s.color}`}>
              <div className='flex items-center justify-between mb-1'>
                <p className='text-xs font-medium opacity-70'>{s.label}</p>
                <span>{s.icon}</span>
              </div>
              <p className='text-2xl font-bold'>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className='flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit'>
          {(['payments', 'coupons', 'pricing'] as AdminTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition ${
                tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'pricing' ? 'Dynamic Pricing' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Payments Tab ── */}
        {tab === 'payments' && (
          <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 text-gray-500 text-xs uppercase'>
                  <tr>
                    <th className='px-4 py-3 text-left'>Reference</th>
                    <th className='px-4 py-3 text-left'>Booking</th>
                    <th className='px-4 py-3 text-left'>Method</th>
                    <th className='px-4 py-3 text-right'>Amount</th>
                    <th className='px-4 py-3 text-left'>Status</th>
                    <th className='px-4 py-3 text-left'>Date</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-50'>
                  {payments.map(p => (
                    <tr key={p.id} className='hover:bg-gray-50'>
                      <td className='px-4 py-3 font-mono text-xs text-gray-500'>{p.reference}</td>
                      <td className='px-4 py-3 text-gray-700'>#{p.booking}</td>
                      <td className='px-4 py-3'>
                        <span className='flex items-center gap-1.5'>
                          <span>{METHOD_ICONS[p.method] || '💰'}</span>
                          <span className='capitalize text-gray-600'>{p.method}</span>
                        </span>
                      </td>
                      <td className='px-4 py-3 text-right font-semibold'>{p.currency} {p.amount}</td>
                      <td className='px-4 py-3'>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-gray-400 text-xs'>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {!payments.length && (
                    <tr><td colSpan={6} className='py-10 text-center text-gray-400'>No payments yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Coupons Tab ── */}
        {tab === 'coupons' && (
          <div>
            <div className='flex justify-end mb-4'>
              <button
                onClick={() => setShowCouponForm(!showCouponForm)}
                className='bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition'
              >
                + New Coupon
              </button>
            </div>

            {showCouponForm && (
              <div className='bg-white rounded-2xl border border-gray-100 p-6 mb-6'>
                <h3 className='font-semibold text-gray-800 mb-4'>Create Coupon</h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FormField label='Code' value={couponForm.code} onChange={v => setCouponForm({...couponForm, code: v.toUpperCase()})} placeholder='e.g. SAVE20' />
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Type</label>
                    <select value={couponForm.type} onChange={e => setCouponForm({...couponForm, type: e.target.value})}
                      className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'>
                      <option value='percentage'>Percentage Off</option>
                      <option value='fixed_amount'>Fixed Amount Off</option>
                      <option value='free_days'>Free Days</option>
                    </select>
                  </div>
                  <FormField label='Value (% or amount or days)' value={couponForm.value} onChange={v => setCouponForm({...couponForm, value: v})} type='number' />
                  <FormField label='Min Booking Amount' value={couponForm.min_booking_amount} onChange={v => setCouponForm({...couponForm, min_booking_amount: v})} type='number' />
                  <FormField label='Max Discount (optional)' value={couponForm.max_discount_amount} onChange={v => setCouponForm({...couponForm, max_discount_amount: v})} type='number' />
                  <FormField label='Usage Limit (optional)' value={couponForm.usage_limit} onChange={v => setCouponForm({...couponForm, usage_limit: v})} type='number' />
                  <FormField label='Per User Limit' value={couponForm.usage_limit_per_user} onChange={v => setCouponForm({...couponForm, usage_limit_per_user: v})} type='number' />
                  <FormField label='Valid From' value={couponForm.valid_from} onChange={v => setCouponForm({...couponForm, valid_from: v})} type='datetime-local' />
                  <FormField label='Valid Until (optional)' value={couponForm.valid_until} onChange={v => setCouponForm({...couponForm, valid_until: v})} type='datetime-local' />
                </div>
                {formError && <p className='text-sm text-red-500 mt-3'>{formError}</p>}
                <div className='flex gap-3 mt-5'>
                  <button onClick={() => setShowCouponForm(false)} className='px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50'>Cancel</button>
                  <button onClick={handleCreateCoupon} disabled={formLoading} className='px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60'>
                    {formLoading ? 'Creating...' : 'Create Coupon'}
                  </button>
                </div>
              </div>
            )}

            <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead className='bg-gray-50 text-gray-500 text-xs uppercase'>
                    <tr>
                      <th className='px-4 py-3 text-left'>Code</th>
                      <th className='px-4 py-3 text-left'>Type</th>
                      <th className='px-4 py-3 text-left'>Value</th>
                      <th className='px-4 py-3 text-center'>Used</th>
                      <th className='px-4 py-3 text-left'>Expires</th>
                      <th className='px-4 py-3 text-left'>Status</th>
                      <th className='px-4 py-3 text-left'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-50'>
                    {coupons.map(c => (
                      <tr key={c.id} className='hover:bg-gray-50'>
                        <td className='px-4 py-3 font-mono font-bold text-blue-700'>{c.code}</td>
                        <td className='px-4 py-3 text-gray-600 capitalize'>{c.type.replace('_', ' ')}</td>
                        <td className='px-4 py-3 font-semibold'>
                          {c.type === 'percentage' ? `${c.value}%` : c.type === 'free_days' ? `${c.value} days` : `OMR ${c.value}`}
                        </td>
                        <td className='px-4 py-3 text-center text-gray-500'>
                          {c.times_used}{c.usage_limit ? `/${c.usage_limit}` : ''}
                        </td>
                        <td className='px-4 py-3 text-gray-400 text-xs'>
                          {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'No expiry'}
                        </td>
                        <td className='px-4 py-3'>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex gap-2'>
                            <button onClick={() => toggleCoupon(c)} className='text-xs text-blue-600 hover:underline'>
                              {c.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <span className='text-gray-300'>|</span>
                            <button onClick={() => deleteCoupon(c.id)} className='text-xs text-red-400 hover:underline'>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!coupons.length && (
                      <tr><td colSpan={7} className='py-10 text-center text-gray-400'>No coupons yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Pricing Rules Tab ── */}
        {tab === 'pricing' && (
          <div>
            <div className='flex justify-end mb-4'>
              <button
                onClick={() => setShowRuleForm(!showRuleForm)}
                className='bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition'
              >
                + New Rule
              </button>
            </div>

            {showRuleForm && (
              <div className='bg-white rounded-2xl border border-gray-100 p-6 mb-6'>
                <h3 className='font-semibold text-gray-800 mb-4'>Create Pricing Rule</h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FormField label='Rule Name' value={ruleForm.name} onChange={v => setRuleForm({...ruleForm, name: v})} placeholder='e.g. Weekend Surcharge' />
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Type</label>
                    <select value={ruleForm.type} onChange={e => setRuleForm({...ruleForm, type: e.target.value})}
                      className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'>
                      <option value='peak_season'>Peak Season</option>
                      <option value='weekend'>Weekend</option>
                      <option value='last_minute'>Last Minute</option>
                      <option value='early_bird'>Early Bird</option>
                      <option value='long_term'>Long Term</option>
                      <option value='special_event'>Special Event</option>
                    </select>
                  </div>
                  <FormField label='Multiplier (e.g. 1.5 = +50%)' value={ruleForm.multiplier} onChange={v => setRuleForm({...ruleForm, multiplier: v})} type='number' />
                  <FormField label='Priority (higher = applies first)' value={ruleForm.priority} onChange={v => setRuleForm({...ruleForm, priority: v})} type='number' />
                  <FormField label='Start Date (optional)' value={ruleForm.start_date} onChange={v => setRuleForm({...ruleForm, start_date: v})} type='date' />
                  <FormField label='End Date (optional)' value={ruleForm.end_date} onChange={v => setRuleForm({...ruleForm, end_date: v})} type='date' />
                  <FormField label='Min Days (optional)' value={ruleForm.min_days} onChange={v => setRuleForm({...ruleForm, min_days: v})} type='number' />
                  <FormField label='Advance Days (for early bird)' value={ruleForm.advance_days} onChange={v => setRuleForm({...ruleForm, advance_days: v})} type='number' />
                </div>
                {formError && <p className='text-sm text-red-500 mt-3'>{formError}</p>}
                <div className='flex gap-3 mt-5'>
                  <button onClick={() => setShowRuleForm(false)} className='px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600'>Cancel</button>
                  <button onClick={handleCreateRule} disabled={formLoading} className='px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60'>
                    {formLoading ? 'Creating...' : 'Create Rule'}
                  </button>
                </div>
              </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {pricingRules.map(rule => (
                <div key={rule.id} className='bg-white rounded-2xl border border-gray-100 p-5'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <p className='font-semibold text-gray-800'>{rule.name}</p>
                      <p className='text-xs text-gray-400 mt-0.5 capitalize'>{rule.type.replace('_', ' ')}</p>
                    </div>
                    <div className={`text-lg font-bold px-3 py-1 rounded-xl ${
                      rule.multiplier > 1 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}>
                      x{rule.multiplier}
                    </div>
                  </div>
                  <div className='mt-3 flex flex-wrap gap-2 text-xs text-gray-500'>
                    {rule.start_date && <span className='bg-gray-100 px-2 py-0.5 rounded'>{rule.start_date} → {rule.end_date}</span>}
                    {rule.min_days && <span className='bg-gray-100 px-2 py-0.5 rounded'>Min {rule.min_days} days</span>}
                    <span className={`px-2 py-0.5 rounded font-medium ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
              {!pricingRules.length && (
                <div className='col-span-2 text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100'>
                  No pricing rules yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Replace the FormField component at the bottom with this:
const FormField = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) => (
  <div>
    <label className='block text-sm font-medium text-gray-700 mb-1'>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
    />
  </div>
)

// const FormField = ({ label, value, onChange, type = 'text', placeholder = '' }: any) => (
//   <div>
//     <label className='block text-sm font-medium text-gray-700 mb-1'>{label}</label>
//     <input
//       type={type}
//       value={value}
//       onChange={e => onChange(e.target.value)}
//       placeholder={placeholder}
//       className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
//     />
//   </div>
// )