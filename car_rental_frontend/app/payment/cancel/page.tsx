'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function PaymentCancelContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('ref')

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-3xl text-yellow-600">
          !
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Payment cancelled</h2>
        <p className="mt-2 text-sm text-gray-500">
          You cancelled the payment before it completed. Your booking hasn't been charged.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {bookingId && (
            <button
              onClick={() => router.push(`/booking/${bookingId}`)}
              className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700"
            >
              Try again
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            className="w-full rounded-xl border border-gray-200 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={null}>
      <PaymentCancelContent />
    </Suspense>
  )
}
