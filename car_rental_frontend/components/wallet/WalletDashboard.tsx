'use client'

import { useEffect, useState } from 'react'
import apiService from '@/app/services/apiService'

interface Transaction {
  id: number
  type: 'credit' | 'debit'
  amount: number
  balance_after: number
  description: string
  reference: string
  created_at: string
}

interface WalletData {
  balance: number
  currency: string
  transactions: Transaction[]
}

export default function WalletDashboard() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpGateway, setTopUpGateway] = useState<'stripe' | 'flutterwave'>('stripe')
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [topUpError, setTopUpError] = useState('')
  const [showTopUp, setShowTopUp] = useState(false)

  const fetchWallet = async () => {
    try {
      const data = await apiService.get('/payments/wallet/')
      setWallet(data)
    } catch (err) {
      console.error('Failed to load wallet:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWallet()
  }, [])

  const handleTopUp = async () => {
    if (!topUpAmount || Number(topUpAmount) <= 0) return
    setTopUpLoading(true)
    setTopUpError('')

    try {
      const data = await apiService.post('/payments/wallet/topup/', {
        amount: topUpAmount,
        gateway: topUpGateway,
        currency: topUpGateway === 'stripe' ? 'USD' : 'NGN',
      })

      if (topUpGateway === 'stripe') {
        // Use Stripe.js to confirm
        const { loadStripe } = await import('@stripe/stripe-js')
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        if (!stripe) throw new Error('Stripe failed to load')

        const { error } = await stripe.confirmPayment({
          clientSecret: data.client_secret,
          confirmParams: {
            return_url: `${window.location.origin}/payment/wallet/topup/confirm?amount=${topUpAmount}&intent=${data.payment_intent_id}`,
          },
        })
        if (error) throw new Error(error.message)
      } else {
        // Flutterwave redirect
        window.location.href = data.payment_link
      }
    } catch (err: any) {
      setTopUpError(err?.message || 'Top up failed')
    } finally {
      setTopUpLoading(false)
    }
  }

  if (loading) return (
    <div className='flex items-center justify-center py-12'>
      <p className='text-gray-400'>Loading wallet...</p>
    </div>
  )

  return (
    <div className='max-w-2xl mx-auto'>

      {/* Balance card */}
      <div className='bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white mb-6'>
        <p className='text-blue-200 text-sm font-medium'>Wallet Balance</p>
        <p className='text-4xl font-bold mt-1'>
        {wallet?.currency ?? 'OMR'} {wallet?.balance != null ? Number(wallet.balance).toFixed(2) : '0.00'}
        </p>
        
        {/* <p className='text-blue-200 text-sm font-medium'>Wallet Balance</p>
        <p className='text-4xl font-bold mt-1'>
          {wallet?.currency} {wallet?.balance.toFixed(2)}
        </p> */}
        <div className='flex gap-3 mt-5'>
          <button
            onClick={() => setShowTopUp(!showTopUp)}
            className='flex-1 bg-white/20 hover:bg-white/30 transition py-2.5 rounded-xl text-sm font-semibold'
          >
            + Top Up
          </button>
          <button className='flex-1 bg-white/20 hover:bg-white/30 transition py-2.5 rounded-xl text-sm font-semibold'>
            History
          </button>
        </div>
      </div>

      {/* Top up panel */}
      {showTopUp && (
        <div className='bg-white rounded-2xl border border-gray-100 p-5 mb-6'>
          <h3 className='font-semibold text-gray-800 mb-4'>Add Money to Wallet</h3>

          <div className='space-y-4'>
            <div>
              <label className='text-sm font-medium text-gray-700 mb-1 block'>Amount</label>
              <div className='relative'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium'>OMR</span>
                <input
                  type='number'
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder='0.00'
                  min='1'
                  className='w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>

            {/* Quick amounts */}
            <div className='flex gap-2'>
              {[10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTopUpAmount(String(amt))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${
                    topUpAmount === String(amt)
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  OMR {amt}
                </button>
              ))}
            </div>

            <div>
              <label className='text-sm font-medium text-gray-700 mb-2 block'>Payment Method</label>
              <div className='grid grid-cols-2 gap-2'>
                {[
                  { id: 'stripe', label: 'Stripe', icon: '💳', desc: 'Credit/Debit Card' },
                  { id: 'flutterwave', label: 'Flutterwave', icon: '🌍', desc: 'Africa payments' },
                ].map((gw) => (
                  <button
                    key={gw.id}
                    onClick={() => setTopUpGateway(gw.id as any)}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      topUpGateway === gw.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className='text-xl'>{gw.icon}</span>
                    <p className='text-sm font-medium text-gray-800 mt-1'>{gw.label}</p>
                    <p className='text-xs text-gray-400'>{gw.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {topUpError && (
              <p className='text-sm text-red-500 bg-red-50 rounded-lg p-3'>{topUpError}</p>
            )}

            <button
              onClick={handleTopUp}
              disabled={topUpLoading || !topUpAmount}
              className='w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2'
            >
              {topUpLoading ? (
                <><span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' /> Processing...</>
              ) : (
                `Top Up OMR ${topUpAmount || '0.00'}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
        <div className='px-5 py-4 border-b border-gray-50'>
          <h3 className='font-semibold text-gray-800'>Transaction History</h3>
        </div>

        {!wallet?.transactions?.length ? (
          <div className='py-10 text-center text-gray-400'>
            <p className='text-3xl mb-2'>👛</p>
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className='divide-y divide-gray-50'>
            {(wallet?.transactions ?? []).map((tx) => (
              <div key={tx.id} className='flex items-center gap-4 px-5 py-4'>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                  tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {tx.type === 'credit' ? '↓' : '↑'}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-gray-800 truncate'>{tx.description}</p>
                  <p className='text-xs text-gray-400 mt-0.5'>
                    {new Date(tx.created_at).toLocaleDateString('en-US', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className='text-right'>
                  <p className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.type === 'credit' ? '+' : '-'}{wallet.currency} {tx.amount.toFixed(2)}
                  </p>
                  <p className='text-xs text-gray-400'>Bal: {tx.balance_after.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}