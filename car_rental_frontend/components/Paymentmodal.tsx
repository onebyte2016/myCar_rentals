'use client'

import { useEffect, useState } from 'react'
import apiService from '@/app/services/apiService'

interface PricingBreakdown {
  car_name: string
  rental_days: number
  base_price: number
  dynamic_price: number
  dynamic_multiplier: number
  applied_rules: { rule: string; multiplier: number }[]
  discount: number
  coupon_message: string
  price_after_discount: number
  tax: number
  security_deposit: number
  total: number
  currency: string
}

interface PaymentModalProps {
  bookingId: number
  carId: number
  pickupDate: string
  returnDate: string
  onSuccess: (paymentRef: string, invoiceNumber: string) => void
  onClose: () => void
}

type Gateway = 'thawani' | 'stripe' | 'flutterwave_card' | 'flutterwave_mobile' | 'wallet'

const MOBILE_NETWORKS: Record<string, string[]> = {
  GH: ['MTN', 'VODAFONE', 'TIGO'],
  KE: ['MPESA', 'AIRTEL'],
  UG: ['MTN', 'AIRTEL'],
  RW: ['MTN', 'AIRTEL'],
  ZM: ['MTN', 'AIRTEL'],
}

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  GH: 'GHS', KE: 'KES', UG: 'UGX', RW: 'RWF', ZM: 'ZMW',
}

export default function PaymentModal({
  bookingId, carId, pickupDate, returnDate, onSuccess, onClose,
}: PaymentModalProps) {
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [gateway, setGateway] = useState<Gateway>('thawani')
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [step, setStep] = useState<'pricing' | 'mobile' | 'processing'>('pricing')
  const [mobilePhone, setMobilePhone] = useState('')
  const [mobileNetwork, setMobileNetwork] = useState('')
  const [mobileCountry, setMobileCountry] = useState('GH')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load pricing + wallet on mount
  useEffect(() => {
    const fetchPricing = async () => {
      setLoading(true)
      try {
        const data = await apiService.post('/payments/pricing/', {
          car_id: carId,
          pickup_date: pickupDate,
          return_date: returnDate,
        })
        setPricing(data)
      } catch (err: any) {
        setError(err?.message || 'Failed to load pricing')
      } finally {
        setLoading(false)
      }
    }
    fetchPricing()
    apiService.get('/payments/wallet/')
      .then((d) => setWalletBalance(d.balance))
      .catch(() => {})
  }, [carId, pickupDate, returnDate])

  const applyCoupon = async () => {
    if (!couponCode || !pricing) return
    setLoading(true)
    try {
      const data = await apiService.post('/payments/pricing/', {
        car_id: carId,
        pickup_date: pickupDate,
        return_date: returnDate,
        coupon_code: couponCode,
      })
      setPricing(data)
      setCouponApplied(data.discount > 0)
      setError(data.discount === 0 ? data.coupon_message : '')
    } catch (err: any) {
      setError(err?.message || 'Failed to apply coupon')
    } finally {
      setLoading(false)
    }
  }

  const handlePay = async () => {
    if (!pricing) return
    setLoading(true)
    setError('')

    try {
      const coupon = couponApplied ? couponCode : ''

      if (gateway === 'wallet') {
        const data = await apiService.post('/payments/wallet/pay/', {
          booking_id: bookingId,
          coupon_code: coupon,
        })
        onSuccess(data.payment_reference, data.invoice_number ?? '')
        return
      }

      if (gateway === 'thawani') {
        const data = await apiService.post('/payments/thawani/create-session/', {
          booking_id: bookingId,
          amount: pricing.total,
          coupon_code: coupon,
        })
        window.location.href = data.checkout_url
        return
      }

      if (gateway === 'flutterwave_card') {
        const data = await apiService.post('/payments/flutterwave/initiate/', {
          booking_id: bookingId,
          amount: pricing.total,
          currency: 'NGN',
          payment_type: 'card',
          coupon_code: coupon,
        })
        window.location.href = data.payment_link
        return
      }

      if (gateway === 'flutterwave_mobile') {
        setStep('mobile')
        return
      }

    } catch (err: any) {
      setError(err?.message || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMobilePay = async () => {
    if (!pricing || !mobilePhone || !mobileNetwork) return
    setLoading(true)
    setError('')
    try {
      await apiService.post('/payments/flutterwave/initiate/', {
        booking_id: bookingId,
        amount: pricing.total,
        currency: CURRENCY_BY_COUNTRY[mobileCountry] || 'GHS',
        payment_type: 'mobile_money',
        phone: mobilePhone,
        network: mobileNetwork,
        country: mobileCountry,
        coupon_code: couponApplied ? couponCode : '',
      })
      setStep('processing')
    } catch (err: any) {
      setError(err?.message || 'Mobile money payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto'>

        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-100'>
          <h2 className='text-lg font-bold text-gray-900'>Complete Payment</h2>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600 text-2xl leading-none'>×</button>
        </div>

        <div className='p-6 space-y-5'>

          {/* Loading state */}
          {loading && !pricing && (
            <div className='text-center py-8 text-gray-400'>Loading pricing...</div>
          )}

          {/* Pricing breakdown */}
          {pricing && (
            <div className='bg-gray-50 rounded-xl p-4 space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Car</span>
                <span className='font-medium'>{pricing.car_name}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Rental ({pricing.rental_days} days)</span>
                <span>{pricing.currency} {pricing.base_price.toFixed(2)}</span>
              </div>
              {pricing.dynamic_multiplier !== 1 && (
                <div className='flex justify-between text-orange-600'>
                  <span>Dynamic pricing ({pricing.applied_rules[0]?.rule})</span>
                  <span>×{pricing.dynamic_multiplier}</span>
                </div>
              )}
              {pricing.discount > 0 && (
                <div className='flex justify-between text-green-600'>
                  <span>Coupon discount</span>
                  <span>-{pricing.currency} {pricing.discount.toFixed(2)}</span>
                </div>
              )}
              <div className='flex justify-between'>
                <span className='text-gray-500'>Tax (5%)</span>
                <span>{pricing.currency} {pricing.tax.toFixed(2)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Security deposit (refundable)</span>
                <span>{pricing.currency} {pricing.security_deposit.toFixed(2)}</span>
              </div>
              <div className='flex justify-between border-t border-gray-200 pt-2 font-bold text-base'>
                <span>Total</span>
                <span className='text-blue-600'>{pricing.currency} {pricing.total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Coupon input */}
          {step === 'pricing' && pricing && (
            <div>
              <label className='text-sm font-medium text-gray-700 block mb-2'>Promo / Coupon Code</label>
              <div className='flex gap-2'>
                <input
                  type='text'
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponApplied(false) }}
                  placeholder='Enter code'
                  className='flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                <button
                  onClick={applyCoupon}
                  disabled={!couponCode || loading}
                  className='px-4 py-2.5 bg-gray-800 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition disabled:opacity-50'
                >
                  Apply
                </button>
              </div>
              {pricing.coupon_message && (
                <p className={`text-xs mt-1.5 ${couponApplied ? 'text-green-600' : 'text-red-500'}`}>
                  {pricing.coupon_message}
                </p>
              )}
            </div>
          )}

          {/* Gateway selection */}
          {step === 'pricing' && pricing && (
            <div>
              <label className='text-sm font-medium text-gray-700 block mb-3'>Payment Method</label>
              <div className='space-y-2'>
                <GatewayOption id='thawani' selected={gateway === 'thawani'} onSelect={() => setGateway('thawani')} icon='🏦' label='Thawani' description='Card payment (Oman)' badge='Recommended' />
                <GatewayOption id='stripe' selected={gateway === 'stripe'} onSelect={() => setGateway('stripe')} icon='💳' label='Stripe' description='International credit/debit card' />
                <GatewayOption id='flutterwave_card' selected={gateway === 'flutterwave_card'} onSelect={() => setGateway('flutterwave_card')} icon='🌍' label='Flutterwave — Card' description='Africa-wide card payment' />
                <GatewayOption id='flutterwave_mobile' selected={gateway === 'flutterwave_mobile'} onSelect={() => setGateway('flutterwave_mobile')} icon='📱' label='Mobile Money' description='MTN, M-Pesa, Airtel, Vodafone' badge='Africa' />
                <GatewayOption
                  id='wallet'
                  selected={gateway === 'wallet'}
                  onSelect={() => setGateway('wallet')}
                  icon='👛'
                  label='Wallet'
                  description={walletBalance !== null ? `Balance: OMR ${Number(walletBalance).toFixed(2)}` : 'Loading...'}
                  disabled={walletBalance !== null && walletBalance < (pricing?.total || 0)}
                  disabledReason='Insufficient balance'
                />
              </div>
            </div>
          )}

          {/* Mobile money details */}
          {step === 'mobile' && (
            <div className='space-y-4'>
              <h3 className='font-semibold text-gray-800'>Mobile Money Details</h3>
              <div>
                <label className='text-sm font-medium text-gray-700 mb-1 block'>Country</label>
                <select value={mobileCountry} onChange={(e) => { setMobileCountry(e.target.value); setMobileNetwork('') }}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'>
                  <option value='GH'>Ghana</option>
                  <option value='KE'>Kenya</option>
                  <option value='UG'>Uganda</option>
                  <option value='RW'>Rwanda</option>
                  <option value='ZM'>Zambia</option>
                </select>
              </div>
              <div>
                <label className='text-sm font-medium text-gray-700 mb-1 block'>Network</label>
                <select value={mobileNetwork} onChange={(e) => setMobileNetwork(e.target.value)}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'>
                  <option value=''>Select network</option>
                  {(MOBILE_NETWORKS[mobileCountry] || []).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className='text-sm font-medium text-gray-700 mb-1 block'>Phone Number</label>
                <input type='tel' value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)}
                  placeholder='+233 XX XXX XXXX'
                  className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
              </div>
            </div>
          )}

          {/* Processing */}
          {step === 'processing' && (
            <div className='text-center py-8'>
              <div className='text-5xl mb-4'>📱</div>
              <h3 className='font-bold text-gray-800 mb-2'>Check Your Phone</h3>
              <p className='text-gray-500 text-sm'>
                A mobile money prompt has been sent to {mobilePhone}. Approve the transaction to complete payment.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className='bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600'>
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className='flex gap-3 pt-2'>
            <button onClick={onClose} className='flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition'>
              Cancel
            </button>

            {step === 'pricing' && pricing && (
              <button
                onClick={handlePay}
                disabled={loading}
                className='flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2'
              >
                {loading
                  ? <><span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' /> Processing...</>
                  : `Pay ${pricing.currency} ${pricing.total.toFixed(2)}`
                }
              </button>
            )}

            {step === 'mobile' && (
              <button
                onClick={handleMobilePay}
                disabled={loading || !mobilePhone || !mobileNetwork}
                className='flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60'
              >
                {loading ? 'Sending...' : 'Send Payment Prompt'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function GatewayOption({ id, selected, onSelect, icon, label, description, badge, disabled, disabledReason }: {
  id: string; selected: boolean; onSelect: () => void
  icon: string; label: string; description: string
  badge?: string; disabled?: boolean; disabledReason?: string
}) {
  return (
    <button
      onClick={() => !disabled && onSelect()}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition ${
        selected ? 'border-blue-500 bg-blue-50'
        : disabled ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
        : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className='text-2xl'>{icon}</span>
      <div className='flex-1'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-gray-800'>{label}</span>
          {badge && <span className='text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium'>{badge}</span>}
        </div>
        <p className='text-xs text-gray-400 mt-0.5'>{disabled ? disabledReason : description}</p>
      </div>
      {selected && <span className='text-blue-600 text-lg'>✓</span>}
    </button>
  )
}



// 'use client'

// import { useEffect, useState } from 'react'
// import apiService from '@/app/services/apiService'

// interface PricingBreakdown {
//   car_name: string
//   rental_days: number
//   base_price: number
//   dynamic_price: number
//   dynamic_multiplier: number
//   applied_rules: { rule: string; multiplier: number }[]
//   discount: number
//   coupon_message: string
//   price_after_discount: number
//   tax: number
//   security_deposit: number
//   total: number
//   currency: string
// }

// interface PaymentModalProps {
//   bookingId: number
//   carId: number
//   pickupDate: string
//   returnDate: string
//   onSuccess: (paymentRef: string, invoiceNumber: string) => void
//   onClose: () => void
// }

// type Gateway = 'stripe' | 'thawani' | 'flutterwave_card' | 'flutterwave_mobile' | 'wallet'

// const MOBILE_MONEY_NETWORKS: Record<string, string[]> = {
//   GH: ['MTN', 'VODAFONE', 'TIGO'],
//   KE: ['MPESA', 'AIRTEL'],
//   UG: ['MTN', 'AIRTEL'],
//   RW: ['MTN', 'AIRTEL'],
//   ZM: ['MTN', 'AIRTEL'],
// }

// const CURRENCY_BY_COUNTRY: Record<string, string> = {
//   GH: 'GHS', KE: 'KES', UG: 'UGX', RW: 'RWF', ZM: 'ZMW',
// }

// export default function PaymentModal({
//   bookingId, carId, pickupDate, returnDate, onSuccess, onClose
// }: PaymentModalProps) {
//   const [step, setStep] = useState<'pricing' | 'gateway' | 'mobile' | 'processing' | 'done'>('pricing')
//   const [pricing, setPricing] = useState<PricingBreakdown | null>(null)
//   const [couponCode, setCouponCode] = useState('')
//   const [couponApplied, setCouponApplied] = useState(false)
//   const [gateway, setGateway] = useState<Gateway>('thawani')
//   const [walletBalance, setWalletBalance] = useState<number | null>(null)
//   const [mobilePhone, setMobilePhone] = useState('')
//   const [mobileNetwork, setMobileNetwork] = useState('')
//   const [mobileCountry, setMobileCountry] = useState('GH')
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')

//   // Load pricing on mount
//   useEffect(() => {
//     const fetchPricing = async () => {
//       setLoading(true)
//       try {
//         const data = await apiService.post('/payments/pricing/', {
//           car_id: carId,
//           pickup_date: pickupDate,
//           return_date: returnDate,
//         })
//         setPricing(data)
//       } catch (err: any) {
//         setError('Failed to load pricing')
//       } finally {
//         setLoading(false)
//       }
//     }
//     fetchPricing()

//     // Load wallet balance
//     apiService.get('/payments/wallet/')
//       .then((data) => setWalletBalance(data.balance))
//       .catch(() => {})
//   }, [carId, pickupDate, returnDate])

//   const applyCoupon = async () => {
//     if (!couponCode || !pricing) return
//     setLoading(true)
//     try {
//       const data = await apiService.post('/payments/pricing/', {
//         car_id: carId,
//         pickup_date: pickupDate,
//         return_date: returnDate,
//         coupon_code: couponCode,
//       })
//       setPricing(data)
//       setCouponApplied(data.discount > 0)
//       setError(data.discount === 0 ? data.coupon_message : '')
//     } catch {
//       setError('Failed to apply coupon')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handlePay = async () => {
//     if (!pricing) return
//     setLoading(true)
//     setError('')

//     try {
//       if (gateway === 'wallet') {
//         const data = await apiService.post('/payments/wallet/pay/', {
//           booking_id: bookingId,
//           coupon_code: couponApplied ? couponCode : '',
//         })
//         onSuccess(data.payment_reference, data.invoice_number)
//         return
//       }

//       if (gateway === 'thawani') {
//         const data = await apiService.post('/payments/thawani/create-session/', {
//           booking_id: bookingId,
//           amount: pricing.total,
//           coupon_code: couponApplied ? couponCode : '',
//         })
//         // Redirect to Thawani checkout
//         window.location.href = data.checkout_url
//         return
//       }

//       if (gateway === 'stripe') {
//         const data = await apiService.post('/payments/stripe/create-intent/', {
//           booking_id: bookingId,
//           amount: pricing.total,
//           currency: 'USD',
//           coupon_code: couponApplied ? couponCode : '',
//         })
//         // Load Stripe.js and confirm payment
//         const { loadStripe } = await import('@stripe/stripe-js')
//         const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
//         if (!stripe) throw new Error('Stripe failed to load')

//         const { error: stripeError } = await stripe.confirmPayment({
//           clientSecret: data.client_secret,
//           confirmParams: {
//             return_url: `${window.location.origin}/payment/stripe/confirm?ref=${data.payment_reference}`,
//           },
//         })
//         if (stripeError) throw new Error(stripeError.message)
//         return
//       }

//       if (gateway === 'flutterwave_card' || gateway === 'flutterwave_mobile') {
//         if (gateway === 'flutterwave_mobile') {
//           setStep('mobile')
//           return
//         }
//         const data = await apiService.post('/payments/flutterwave/initiate/', {
//           booking_id: bookingId,
//           amount: pricing.total,
//           currency: 'NGN',
//           payment_type: 'card',
//           coupon_code: couponApplied ? couponCode : '',
//         })
//         window.location.href = data.payment_link
//       }
//     } catch (err: any) {
//       setError(err?.message || 'Payment failed. Please try again.')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleMobilePay = async () => {
//     if (!pricing || !mobilePhone || !mobileNetwork) return
//     setLoading(true)
//     setError('')
//     try {
//       const data = await apiService.post('/payments/flutterwave/initiate/', {
//         booking_id: bookingId,
//         amount: pricing.total,
//         currency: CURRENCY_BY_COUNTRY[mobileCountry] || 'GHS',
//         payment_type: 'mobile_money',
//         phone: mobilePhone,
//         network: mobileNetwork,
//         country: mobileCountry,
//         coupon_code: couponApplied ? couponCode : '',
//       })
//       // For mobile money, show a pending message
//       setStep('processing')
//     } catch (err: any) {
//       setError(err?.message || 'Mobile money payment failed')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
//       <div className='bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto'>

//         {/* Header */}
//         <div className='flex items-center justify-between p-6 border-b border-gray-100'>
//           <h2 className='text-lg font-bold text-gray-900'>Complete Payment</h2>
//           <button onClick={onClose} className='text-gray-400 hover:text-gray-600 text-2xl leading-none'>×</button>
//         </div>

//         <div className='p-6 space-y-5'>

//           {/* ── Pricing Breakdown ── */}
//           {pricing && (
//             <div className='bg-gray-50 rounded-xl p-4 space-y-2 text-sm'>
//               <div className='flex justify-between'>
//                 <span className='text-gray-500'>Car</span>
//                 <span className='font-medium'>{pricing.car_name}</span>
//               </div>
//               <div className='flex justify-between'>
//                 <span className='text-gray-500'>Rental ({pricing.rental_days} days)</span>
//                 <span>{pricing.currency} {pricing.base_price.toFixed(2)}</span>
//               </div>
//               {pricing.dynamic_multiplier !== 1 && (
//                 <div className='flex justify-between text-orange-600'>
//                   <span>Dynamic pricing ({pricing.applied_rules[0]?.rule})</span>
//                   <span>x{pricing.dynamic_multiplier}</span>
//                 </div>
//               )}
//               {pricing.discount > 0 && (
//                 <div className='flex justify-between text-green-600'>
//                   <span>Coupon discount</span>
//                   <span>-{pricing.currency} {pricing.discount.toFixed(2)}</span>
//                 </div>
//               )}
//               <div className='flex justify-between'>
//                 <span className='text-gray-500'>Tax (5% VAT)</span>
//                 <span>{pricing.currency} {pricing.tax.toFixed(2)}</span>
//               </div>
//               <div className='flex justify-between'>
//                 <span className='text-gray-500'>Security deposit (refundable)</span>
//                 <span>{pricing.currency} {pricing.security_deposit.toFixed(2)}</span>
//               </div>
//               <div className='flex justify-between border-t border-gray-200 pt-2 font-bold text-base'>
//                 <span>Total</span>
//                 <span className='text-blue-600'>{pricing.currency} {pricing.total.toFixed(2)}</span>
//               </div>
//             </div>
//           )}

//           {loading && !pricing && (
//             <div className='text-center py-8 text-gray-400'>Loading pricing...</div>
//           )}

//           {/* ── Coupon ── */}
//           {step === 'pricing' && pricing && (
//             <div>
//               <label className='text-sm font-medium text-gray-700 block mb-2'>Promo / Coupon Code</label>
//               <div className='flex gap-2'>
//                 <input
//                   type='text'
//                   value={couponCode}
//                   onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponApplied(false) }}
//                   placeholder='Enter code'
//                   className='flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
//                 />
//                 <button
//                   onClick={applyCoupon}
//                   disabled={!couponCode || loading}
//                   className='px-4 py-2.5 bg-gray-800 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition disabled:opacity-50'
//                 >
//                   Apply
//                 </button>
//               </div>
//               {pricing.coupon_message && (
//                 <p className={`text-xs mt-1.5 ${couponApplied ? 'text-green-600' : 'text-red-500'}`}>
//                   {pricing.coupon_message}
//                 </p>
//               )}
//             </div>
//           )}

//           {/* ── Gateway Selection ── */}
//           {step === 'pricing' && pricing && (
//             <div>
//               <label className='text-sm font-medium text-gray-700 block mb-3'>Payment Method</label>
//               <div className='space-y-2'>

//                 <GatewayOption
//                   id='thawani'
//                   selected={gateway === 'thawani'}
//                   onSelect={() => setGateway('thawani')}
//                   icon='🏦'
//                   label='Thawani'
//                   description='Card payment (Oman)'
//                   badge='Recommended'
//                 />

//                 <GatewayOption
//                   id='stripe'
//                   selected={gateway === 'stripe'}
//                   onSelect={() => setGateway('stripe')}
//                   icon='💳'
//                   label='Stripe'
//                   description='International credit/debit card'
//                 />

//                 <GatewayOption
//                   id='flutterwave_card'
//                   selected={gateway === 'flutterwave_card'}
//                   onSelect={() => setGateway('flutterwave_card')}
//                   icon='🌍'
//                   label='Flutterwave — Card'
//                   description='Africa-wide card payment'
//                 />

//                 <GatewayOption
//                   id='flutterwave_mobile'
//                   selected={gateway === 'flutterwave_mobile'}
//                   onSelect={() => setGateway('flutterwave_mobile')}
//                   icon='📱'
//                   label='Mobile Money'
//                   description='MTN, M-Pesa, Airtel, Vodafone'
//                   badge='Africa'
//                 />

//                 <GatewayOption
//                   id='wallet'
//                   selected={gateway === 'wallet'}
//                   onSelect={() => setGateway('wallet')}
//                   icon='👛'
//                   label='Wallet'
//                   description={walletBalance !== null ? `Balance: OMR ${walletBalance.toFixed(2)}` : 'Loading...'}
//                   disabled={walletBalance !== null && walletBalance < (pricing?.total || 0)}
//                   disabledReason='Insufficient balance'
//                 />
//               </div>
//             </div>
//           )}

//           {/* ── Mobile Money Details ── */}
//           {step === 'mobile' && (
//             <div className='space-y-4'>
//               <h3 className='font-semibold text-gray-800'>Mobile Money Details</h3>

//               <div>
//                 <label className='text-sm font-medium text-gray-700 mb-1 block'>Country</label>
//                 <select
//                   value={mobileCountry}
//                   onChange={(e) => { setMobileCountry(e.target.value); setMobileNetwork('') }}
//                   className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
//                 >
//                   <option value='GH'>Ghana</option>
//                   <option value='KE'>Kenya</option>
//                   <option value='UG'>Uganda</option>
//                   <option value='RW'>Rwanda</option>
//                   <option value='ZM'>Zambia</option>
//                 </select>
//               </div>

//               <div>
//                 <label className='text-sm font-medium text-gray-700 mb-1 block'>Network</label>
//                 <select
//                   value={mobileNetwork}
//                   onChange={(e) => setMobileNetwork(e.target.value)}
//                   className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
//                 >
//                   <option value=''>Select network</option>
//                   {(MOBILE_MONEY_NETWORKS[mobileCountry] || []).map((n) => (
//                     <option key={n} value={n}>{n}</option>
//                   ))}
//                 </select>
//               </div>

//               <div>
//                 <label className='text-sm font-medium text-gray-700 mb-1 block'>Phone Number</label>
//                 <input
//                   type='tel'
//                   value={mobilePhone}
//                   onChange={(e) => setMobilePhone(e.target.value)}
//                   placeholder='+233 XX XXX XXXX'
//                   className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
//                 />
//               </div>
//             </div>
//           )}

//           {/* ── Processing ── */}
//           {step === 'processing' && (
//             <div className='text-center py-8'>
//               <div className='text-5xl mb-4'>📱</div>
//               <h3 className='font-bold text-gray-800 mb-2'>Check Your Phone</h3>
//               <p className='text-gray-500 text-sm'>
//                 A mobile money prompt has been sent to {mobilePhone}.
//                 Approve the transaction to complete your payment.
//               </p>
//             </div>
//           )}

//           {/* Error */}
//           {error && (
//             <div className='bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600'>
//               {error}
//             </div>
//           )}

//           {/* Actions */}
//           <div className='flex gap-3 pt-2'>
//             <button
//               onClick={onClose}
//               className='flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition'
//             >
//               Cancel
//             </button>

//             {step === 'pricing' && (
//               <button
//                 onClick={handlePay}
//                 disabled={loading || !pricing}
//                 className='flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2'
//               >
//                 {loading ? (
//                   <><span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' /> Processing...</>
//                 ) : (
//                   `Pay ${pricing ? `${pricing.currency} ${pricing.total.toFixed(2)}` : '...'}`
//                 )}
//               </button>
//             )}

//             {step === 'mobile' && (
//               <button
//                 onClick={handleMobilePay}
//                 disabled={loading || !mobilePhone || !mobileNetwork}
//                 className='flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60'
//               >
//                 {loading ? 'Sending...' : 'Send Payment Prompt'}
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// /* ── Gateway Option Component ── */
// function GatewayOption({
//   id, selected, onSelect, icon, label, description, badge, disabled, disabledReason
// }: {
//   id: string; selected: boolean; onSelect: () => void
//   icon: string; label: string; description: string
//   badge?: string; disabled?: boolean; disabledReason?: string
// }) {
//   return (
//     <button
//       onClick={() => !disabled && onSelect()}
//       disabled={disabled}
//       className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition ${
//         selected
//           ? 'border-blue-500 bg-blue-50'
//           : disabled
//           ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
//           : 'border-gray-200 hover:border-gray-300'
//       }`}
//     >
//       <span className='text-2xl'>{icon}</span>
//       <div className='flex-1'>
//         <div className='flex items-center gap-2'>
//           <span className='text-sm font-semibold text-gray-800'>{label}</span>
//           {badge && (
//             <span className='text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium'>
//               {badge}
//             </span>
//           )}
//         </div>
//         <p className='text-xs text-gray-400 mt-0.5'>{disabled ? disabledReason : description}</p>
//       </div>
//       {selected && <span className='text-blue-600 text-lg'>✓</span>}
//     </button>
//   )
// }