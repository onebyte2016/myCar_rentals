'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import apiService from '@/app/services/apiService'

interface Currency { code: string; name: string; symbol: string }
interface CouponResult {
  valid: boolean; code: string; discount_amount: number
  original_amount: number; final_amount: number; message?: string
}

interface Props {
  bookingId: number
  bookingAmount: number
  carName: string
  pickupDate: string
  returnDate: string
}

type Gateway = 'stripe' | 'thawani' | 'flutterwave' | 'wallet' | 'bank_transfer' | 'mobile_money'
type Method = 'card' | 'bank_transfer' | 'wallet' | 'mobile_money'

const GATEWAYS: { id: Gateway; label: string; icon: string; methods: Method[]; regions: string }[] = [
  { id: 'stripe', label: 'Card (Stripe)', icon: '💳', methods: ['card'], regions: 'International' },
  { id: 'thawani', label: 'Thawani', icon: '🟢', methods: ['card'], regions: 'Oman' },
  { id: 'flutterwave', label: 'Flutterwave', icon: '🦋', methods: ['card', 'mobile_money', 'bank_transfer'], regions: 'Africa' },
  { id: 'wallet', label: 'Wallet', icon: '👛', methods: ['wallet'], regions: 'Instant' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', methods: ['bank_transfer'], regions: 'Manual' },
  { id: 'mobile_money', label: 'Mobile Money', icon: '📱', methods: ['mobile_money'], regions: 'Africa' },
]

const MOBILE_NETWORKS = ['MTN', 'VODAFONE', 'AIRTEL', 'TIGO', 'MPESA']

export default function PaymentCheckout({ bookingId, bookingAmount, carName, pickupDate, returnDate }: Props) {
  const router = useRouter()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState('OMR')
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [mobileNetwork, setMobileNetwork] = useState('MTN')
  const [securityDeposit, setSecurityDeposit] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'select' | 'confirm' | 'processing' | 'success' | 'failed'>('select')
  const [paymentResult, setPaymentResult] = useState<any>(null)

  const finalAmount = couponResult?.valid ? couponResult.final_amount : bookingAmount
  const discount = couponResult?.valid ? couponResult.discount_amount : 0

  useEffect(() => {
    apiService.get('/currencies/').then(setCurrencies).catch(console.error)
    apiService.get('/wallet/').then((w) => setWalletBalance(parseFloat(w.balance))).catch(console.error)
  }, [])

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const result = await apiService.post('/coupons/validate/', {
        code: couponCode.trim().toUpperCase(),
        booking_amount: bookingAmount,
      })
      setCouponResult(result)
    } catch (err: any) {
      setCouponResult({ valid: false, code: couponCode, discount_amount: 0, original_amount: bookingAmount, final_amount: bookingAmount, message: 'Invalid coupon' })
    } finally {
      setCouponLoading(false)
    }
  }

  const handleSelectGateway = (gw: typeof GATEWAYS[0]) => {
    setSelectedGateway(gw.id)
    setSelectedMethod(gw.methods[0])
    setError('')
  }

  const handlePay = async () => {
    if (!selectedGateway || !selectedMethod) {
      setError('Please select a payment method')
      return
    }
    setLoading(true)
    setStep('processing')
    setError('')

    try {
      const payload: any = {
        booking_id: bookingId,
        gateway: selectedGateway,
        method: selectedMethod,
        currency_code: selectedCurrency,
        security_deposit: securityDeposit,
      }
      if (couponResult?.valid) payload.coupon_code = couponCode.toUpperCase()
      if (selectedGateway === 'flutterwave' && selectedMethod === 'mobile_money') {
        payload.phone_number = phoneNumber
        payload.mobile_network = mobileNetwork
      }

      const result = await apiService.post('/payments/initiate/', payload)
      setPaymentResult(result)

      // Redirect to gateway checkout pages
      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }

      // Stripe — use client_secret
      if (result.client_secret) {
        router.push(`/payment/stripe?secret=${result.client_secret}&payment_id=${result.payment_id}`)
        return
      }

      // Wallet or bank transfer — completed/pending immediately
      if (result.status === 'completed') {
        setStep('success')
      } else if (result.status === 'pending') {
        setStep('success') // bank transfer pending
      }
    } catch (err: any) {
      setError(err?.message || 'Payment failed. Please try again.')
      setStep('failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className='min-h-[60vh] flex items-center justify-center'>
        <div className='text-center max-w-md'>
          <div className='text-6xl mb-4'>
            {paymentResult?.status === 'pending' ? '🏦' : '✅'}
          </div>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            {paymentResult?.status === 'pending' ? 'Transfer Instructions Sent' : 'Payment Successful!'}
          </h2>
          {paymentResult?.status === 'pending' && paymentResult?.instructions && (
            <div className='bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 text-left text-sm'>
              <p className='font-semibold text-blue-800 mb-3'>Bank Transfer Details</p>
              <div className='space-y-2 text-blue-700'>
                <p><span className='font-medium'>Bank:</span> {paymentResult.instructions.bank_name}</p>
                <p><span className='font-medium'>Account:</span> {paymentResult.instructions.account_number}</p>
                <p><span className='font-medium'>Name:</span> {paymentResult.instructions.account_name}</p>
                <p><span className='font-medium'>Reference:</span> <span className='font-mono font-bold'>{paymentResult.instructions.reference}</span></p>
                <p><span className='font-medium'>Amount:</span> {paymentResult.instructions.currency} {paymentResult.instructions.amount}</p>
              </div>
              <p className='text-xs text-blue-500 mt-3'>Use the reference number when making the transfer</p>
            </div>
          )}
          <button
            onClick={() => router.push(`/booking/${bookingId}`)}
            className='bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition'
          >
            View Booking
          </button>
        </div>
      </div>
    )
  }

  // ── Failed screen ───────────────────────────────────────────────────────────
  if (step === 'failed') {
    return (
      <div className='min-h-[60vh] flex items-center justify-center'>
        <div className='text-center max-w-md'>
          <div className='text-6xl mb-4'>❌</div>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>Payment Failed</h2>
          <p className='text-gray-500 mb-6'>{error}</p>
          <button
            onClick={() => { setStep('select'); setError('') }}
            className='bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition'
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // ── Processing screen ───────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className='min-h-[60vh] flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4' />
          <p className='text-gray-600 font-medium'>Processing your payment...</p>
        </div>
      </div>
    )
  }

  // ── Main checkout ───────────────────────────────────────────────────────────
  return (
    <div className='max-w-2xl mx-auto px-4 py-8'>
      <h1 className='text-2xl font-bold text-gray-900 mb-6'>Complete Payment</h1>

      {/* Order summary */}
      <div className='bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100'>
        <h3 className='font-semibold text-gray-800 mb-3'>Order Summary</h3>
        <div className='space-y-2 text-sm'>
          <div className='flex justify-between'>
            <span className='text-gray-500'>Car</span>
            <span className='font-medium text-gray-800'>{carName}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-gray-500'>Pickup</span>
            <span className='text-gray-800'>{pickupDate}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-gray-500'>Return</span>
            <span className='text-gray-800'>{returnDate}</span>
          </div>
          <div className='border-t border-gray-200 my-2' />
          <div className='flex justify-between'>
            <span className='text-gray-500'>Subtotal</span>
            <span className='text-gray-800'>OMR {bookingAmount.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className='flex justify-between text-green-600'>
              <span>Discount ({couponCode})</span>
              <span>-OMR {discount.toFixed(2)}</span>
            </div>
          )}
          {securityDeposit > 0 && (
            <div className='flex justify-between text-orange-600'>
              <span>Security Deposit</span>
              <span>+OMR {securityDeposit.toFixed(2)}</span>
            </div>
          )}
          <div className='flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2'>
            <span>Total</span>
            <span className='text-blue-600'>OMR {(finalAmount + securityDeposit).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Currency selector */}
      <div className='mb-5'>
        <label className='block text-sm font-medium text-gray-700 mb-2'>Currency</label>
        <select
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>
          ))}
        </select>
      </div>

      {/* Coupon */}
      <div className='mb-5'>
        <label className='block text-sm font-medium text-gray-700 mb-2'>Promo Code</label>
        <div className='flex gap-2'>
          <input
            type='text'
            value={couponCode}
            onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null) }}
            placeholder='Enter promo code'
            className='flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase'
          />
          <button
            onClick={handleValidateCoupon}
            disabled={couponLoading || !couponCode.trim()}
            className='px-5 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition disabled:opacity-50'
          >
            {couponLoading ? '...' : 'Apply'}
          </button>
        </div>
        {couponResult && (
          <p className={`text-xs mt-1.5 ${couponResult.valid ? 'text-green-600' : 'text-red-500'}`}>
            {couponResult.valid
              ? `✓ Coupon applied — you save OMR ${couponResult.discount_amount.toFixed(2)}`
              : `✗ ${couponResult.message || 'Invalid coupon'}`}
          </p>
        )}
      </div>

      {/* Security deposit */}
      <div className='mb-6'>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          Security Deposit (optional)
        </label>
        <input
          type='number'
          value={securityDeposit || ''}
          onChange={(e) => setSecurityDeposit(parseFloat(e.target.value) || 0)}
          placeholder='0.00'
          min='0'
          step='0.01'
          className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
        <p className='text-xs text-gray-400 mt-1'>Refunded at end of rental if no damage</p>
      </div>

      {/* Gateway selection */}
      <div className='mb-6'>
        <label className='block text-sm font-medium text-gray-700 mb-3'>Payment Method</label>
        <div className='grid grid-cols-2 gap-3'>
          {GATEWAYS.map((gw) => (
            <button
              key={gw.id}
              onClick={() => handleSelectGateway(gw)}
              className={`flex flex-col items-start p-4 rounded-2xl border-2 transition text-left ${
                selectedGateway === gw.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className='flex items-center gap-2 mb-1'>
                <span className='text-xl'>{gw.icon}</span>
                <span className='font-semibold text-sm text-gray-800'>{gw.label}</span>
              </div>
              <span className='text-xs text-gray-400'>{gw.regions}</span>
              {gw.id === 'wallet' && walletBalance !== null && (
                <span className={`text-xs mt-1 font-medium ${walletBalance >= finalAmount ? 'text-green-600' : 'text-red-500'}`}>
                  Balance: OMR {walletBalance.toFixed(2)}
                  {walletBalance < finalAmount && ' (insufficient)'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile money extra fields */}
      {(selectedGateway === 'flutterwave' || selectedGateway === 'mobile_money') &&
        selectedMethod === 'mobile_money' && (
          <div className='mb-6 space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Phone Number</label>
              <input
                type='tel'
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder='+2348012345678'
                className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Network</label>
              <select
                value={mobileNetwork}
                onChange={(e) => setMobileNetwork(e.target.value)}
                className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
              >
                {MOBILE_NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}

      {/* Error */}
      {error && (
        <div className='mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600'>
          {error}
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={!selectedGateway || loading || (selectedGateway === 'wallet' && walletBalance !== null && walletBalance < finalAmount)}
        className='w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-lg'
      >
        {loading ? (
          <><span className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' /> Processing...</>
        ) : (
          <>Pay {selectedCurrency} {(finalAmount + securityDeposit).toFixed(2)}</>
        )}
      </button>

      <p className='text-center text-xs text-gray-400 mt-4'>
        🔒 Payments are secure and encrypted
      </p>
    </div>
  )
}