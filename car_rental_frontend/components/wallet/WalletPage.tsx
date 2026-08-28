'use client'

import { useEffect, useState } from 'react'
import apiService from '@/app/services/apiService'

interface WalletData {
  balance: number; currency_code: string; currency_symbol: string; updated_at: string
}
interface Transaction {
  id: number; amount: number; transaction_type: string
  description: string; reference: string; balance_after: number; created_at: string
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupGateway, setTopupGateway] = useState('stripe')
  const [topupLoading, setTopupLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiService.get('/payments/wallet/'),
      apiService.get('/payments/wallet/transactions/'),
    ]).then(([w, t]) => {
      setWallet(w)
      setTransactions(Array.isArray(t) ? t : [])
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  const handleTopUp = async () => {
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      setError('Enter a valid amount')
      return
    }
    setTopupLoading(true)
    setError('')
    try {
      const result = await apiService.post('/payments/wallet/topup/', {
        amount: topupAmount,
        gateway: topupGateway,
        currency_code: wallet?.currency_code ?? 'OMR',
      })
      if (result.checkout_url) {
        window.location.href = result.checkout_url
      } else if (result.client_secret) {
        alert('Stripe top-up initiated. Integrate Stripe Elements to complete.')
      }
    } catch (err: any) {
      setError(err?.message || 'Top-up failed')
    } finally {
      setTopupLoading(false)
    }
  }

  const typeColor: Record<string, string> = {
    credit: 'text-green-600',
    debit: 'text-red-500',
    refund: 'text-blue-600',
  }
  const typeIcon: Record<string, string> = {
    credit: '↓', debit: '↑', refund: '↩'
  }

  if (loading) return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <p className='text-gray-400'>Loading wallet...</p>
    </div>
  )

  return (
    <div className='min-h-screen bg-gray-50 py-10 px-4'>
      <div className='max-w-2xl mx-auto'>

        {/* Balance card */}
        <div className='bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white mb-6 shadow-lg'>
          <p className='text-sm font-medium opacity-80 mb-1'>Available Balance</p>
          <p className='text-5xl font-bold'>
            {wallet?.currency_symbol}{parseFloat(String(wallet?.balance ?? 0)).toFixed(2)}
          </p>
          <p className='text-xs opacity-60 mt-3'>
            {wallet?.currency_code} · Updated {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleDateString() : '—'}
          </p>
        </div>

        {/* Top up */}
        <div className='bg-white rounded-2xl border border-gray-100 p-6 mb-6'>
          <h2 className='font-bold text-gray-900 mb-4'>Top Up Wallet</h2>
          <div className='grid grid-cols-3 gap-3 mb-4'>
            {['10', '25', '50', '100', '200', '500'].map((amt) => (
              <button
                key={amt}
                onClick={() => setTopupAmount(amt)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                  topupAmount === amt
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                OMR {amt}
              </button>
            ))}
          </div>
          <input
            type='number'
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            placeholder='Or enter custom amount'
            className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3'
          />
          <div className='grid grid-cols-3 gap-2 mb-4'>
            {[
              { id: 'stripe', label: 'Card', icon: '💳' },
              { id: 'thawani', label: 'Thawani', icon: '🇴🇲' },
              { id: 'flutterwave', label: 'Flutterwave', icon: '🦋' },
            ].map((gw) => (
              <button
                key={gw.id}
                onClick={() => setTopupGateway(gw.id)}
                className={`py-2 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1 ${
                  topupGateway === gw.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {gw.icon} {gw.label}
              </button>
            ))}
          </div>
          {error && <p className='text-red-500 text-xs mb-3'>{error}</p>}
          <button
            onClick={handleTopUp}
            disabled={topupLoading}
            className='w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-60'
          >
            {topupLoading ? 'Processing...' : `Top Up ${topupAmount ? `OMR ${topupAmount}` : ''}`}
          </button>
        </div>

        {/* Transactions */}
        <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
          <div className='px-5 py-4 border-b border-gray-50'>
            <h2 className='font-bold text-gray-900'>Transaction History</h2>
          </div>
          <div className='divide-y divide-gray-50'>
            {transactions.map((t) => (
              <div key={t.id} className='flex items-center justify-between px-5 py-4'>
                <div className='flex items-center gap-3'>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                    t.transaction_type === 'credit' ? 'bg-green-100 text-green-600' :
                    t.transaction_type === 'debit' ? 'bg-red-100 text-red-500' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {typeIcon[t.transaction_type]}
                  </div>
                  <div>
                    <p className='text-sm font-medium text-gray-800'>{t.description || t.reference}</p>
                    <p className='text-xs text-gray-400'>{new Date(t.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className={`font-bold text-sm ${typeColor[t.transaction_type]}`}>
                    {t.transaction_type === 'debit' ? '-' : '+'}OMR {parseFloat(String(t.amount)).toFixed(2)}
                  </p>
                  <p className='text-xs text-gray-400'>
                    Bal: OMR {parseFloat(String(t.balance_after)).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {!transactions.length && (
              <div className='py-10 text-center text-gray-400'>
                <p className='text-3xl mb-2'>💳</p>
                <p>No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}