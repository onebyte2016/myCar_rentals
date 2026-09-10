'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import apiService from '@/app/services/apiService'

interface VerifyResult {
  status: 'completed' | 'failed'
  payment_reference?: string
  amount?: number
  currency?: string
  booking?: {
    id: number
    car_name?: string
    plate_number?: string
    pickup_date?: string
    return_date?: string
    pickup_location?: string
    dropoff_location?: string
    total_price?: string
    client_name?: string
  }
  message?: string
}

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('ref')

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bookingId) {
      setError('Missing booking reference.')
      setLoading(false)
      return
    }

    apiService
      .get(`/payments/thawani/verify-booking/${bookingId}/`)
      .then((res) => setResult(res))
      .catch((err: any) => setError(err?.message || 'Could not verify this payment.'))
      .finally(() => setLoading(false))
  }, [bookingId])

  const printReceipt = () => {
    window.print()
  }

  const downloadReceipt = async () => {
    if (!result || result.status !== 'completed') return
    const booking = result.booking
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    const headerHeight = 52
    doc.setFillColor(30, 64, 175)
    doc.rect(0, 0, pageWidth, headerHeight, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ABELIZA CAR RENTALS', pageWidth / 2, 16, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('PAYMENT RECEIPT', pageWidth / 2, 25, { align: 'center' })
    doc.setFontSize(8)
    doc.setTextColor(186, 210, 255)
    doc.text('123 Rental Street, Salalah, Oman', 14, 42)
    doc.text('info@abeliza.com', pageWidth / 2, 42, { align: 'center' })
    doc.text('+96896069582', pageWidth - 14, 42, { align: 'right' })

    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, headerHeight + 8, { align: 'right' })

    doc.setFillColor(220, 252, 231)
    doc.rect(0, headerHeight + 4, pageWidth, 14, 'F')
    doc.setTextColor(21, 128, 61)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('PAYMENT SUCCESSFUL', pageWidth / 2, headerHeight + 13, { align: 'center' })

    let y = headerHeight + 30

    const drawSection = (title: string, rows: [string, string][]) => {
      doc.setFillColor(243, 244, 246)
      doc.rect(14, y - 5, pageWidth - 28, 10, 'F')
      doc.setTextColor(30, 64, 175)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(title.toUpperCase(), 18, y + 2)
      y += 12
      doc.setTextColor(50, 50, 50)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      rows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.text(`${label}:`, 18, y)
        doc.setFont('helvetica', 'normal')
        doc.text(value || '—', 80, y)
        y += 8
      })
      y += 4
    }

    drawSection('Payment Details', [
      ['Client Name', booking?.client_name || '—'],
      ['Payment Reference', result.payment_reference || '—'],
      ['Amount Paid', typeof result.amount === 'number' ? `${result.currency} ${result.amount.toFixed(3)}` : '—'],
      ['Payment Method', 'Thawani'],
      ['Status', 'Paid'],
    ])

    if (booking) {
      drawSection('Booking Details', [
        ['Booking ID', `#${booking.id}`],
        ['Car', booking.car_name || '—'],
        ['Plate Number', booking.plate_number || '—'],
        ['Pickup Date', booking.pickup_date || '—'],
        ['Return Date', booking.return_date || '—'],
        ['Pickup Location', booking.pickup_location || '—'],
        ['Dropoff Location', booking.dropoff_location || '—'],
      ])
    }

    const pageHeight = doc.internal.pageSize.getHeight()
    const footerHeight = 24
    doc.setFillColor(30, 64, 175)
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('ABELIZA CAR RENTALS', 14, pageHeight - footerHeight + 9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(186, 210, 255)
    doc.text('123 Rental Street, Salalah Oman  |  info@abeliza.com  |  +96896069582', 14, pageHeight - footerHeight + 17)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.text('Thank you for booking with us.', pageWidth - 14, pageHeight - footerHeight + 17, { align: 'right' })

    doc.save(`payment-receipt-${result.payment_reference || booking?.id || 'abeliza'}.pdf`)
  }

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between px-4 py-2 text-sm">
      <span className="font-semibold text-gray-700">{label}:</span>
      <span className="text-gray-800">{value || '—'}</span>
    </div>
  )

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4 print:block print:min-h-0 print:bg-white print:p-0">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm print:hidden">
        {loading && (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
            <h2 className="text-xl font-semibold text-gray-800">Confirming your payment…</h2>
            <p className="mt-2 text-sm text-gray-500">Hang tight, we're verifying this with Thawani.</p>
          </>
        )}

        {!loading && result?.status === 'completed' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
              ✓
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Payment successful</h2>
            <p className="mt-2 text-sm text-gray-500">
              {result.booking?.car_name ? `Your booking for ${result.booking.car_name} is confirmed.` : 'Your booking is confirmed.'}
            </p>

            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-left text-sm">
              {result.booking?.client_name && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Client</span>
                  <span className="font-medium text-gray-800">{result.booking.client_name}</span>
                </div>
              )}
              {result.payment_reference && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Reference</span>
                  <span className="font-medium text-gray-800">{result.payment_reference}</span>
                </div>
              )}
              {typeof result.amount === 'number' && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Amount paid</span>
                  <span className="font-medium text-gray-800">
                    {result.currency} {result.amount.toFixed(3)}
                  </span>
                </div>
              )}
            </div>

            <div className="print:hidden mt-6 flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={downloadReceipt}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  ⬇ Download Receipt
                </button>
                <button
                  onClick={printReceipt}
                  className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  🖨 Print Receipt
                </button>
              </div>
              <button
                onClick={() => router.push('/')}
                className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700"
              >
                Back to home
              </button>
            </div>
          </>
        )}

        {!loading && (error || result?.status === 'failed') && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
              ✕
            </div>
            <h2 className="text-xl font-semibold text-gray-800">We couldn't confirm this payment</h2>
            <p className="mt-2 text-sm text-gray-500">{error || result?.message}</p>

            <button
              onClick={() => router.push('/')}
              className="mt-6 w-full rounded-xl border border-gray-200 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Back to home
            </button>
          </>
        )}
      </div>

      {/* Print-only receipt — mirrors the downloaded PDF layout exactly.
          Hidden on screen, shown only when printing (window.print()). */}
      {!loading && result?.status === 'completed' && (
        <div className="hidden print:block w-full">
          <div className="bg-blue-800 text-white px-6 py-4">
            <h1 className="text-center text-2xl font-bold tracking-wide">ABELIZA CAR RENTALS</h1>
            <p className="text-center text-sm mt-1">PAYMENT RECEIPT</p>
            <div className="flex justify-between text-xs text-blue-200 mt-4">
              <span>123 Rental Street, Salalah, Oman</span>
              <span>info@abeliza.com</span>
              <span>+96896069582</span>
            </div>
          </div>

          <p className="text-right text-xs text-gray-400 px-6 py-1">
            Generated: {new Date().toLocaleString()}
          </p>

          <div className="bg-green-100 py-3">
            <p className="text-center text-sm font-bold text-green-700 tracking-wide">PAYMENT SUCCESSFUL</p>
          </div>

          <div className="px-6 mt-4">
            <div className="border border-gray-100 rounded overflow-hidden mb-4">
              <div className="bg-gray-100 px-4 py-2 text-sm font-bold text-blue-800 uppercase tracking-wide">
                Payment Details
              </div>
              <DetailRow label="Client Name" value={result.booking?.client_name || '—'} />
              <DetailRow label="Payment Reference" value={result.payment_reference || '—'} />
              <DetailRow
                label="Amount Paid"
                value={typeof result.amount === 'number' ? `${result.currency} ${result.amount.toFixed(3)}` : '—'}
              />
              <DetailRow label="Payment Method" value="Thawani" />
              <DetailRow label="Status" value="Paid" />
            </div>

            {result.booking && (
              <div className="border border-gray-100 rounded overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 text-sm font-bold text-blue-800 uppercase tracking-wide">
                  Booking Details
                </div>
                <DetailRow label="Booking ID" value={`#${result.booking.id}`} />
                <DetailRow label="Car" value={result.booking.car_name || '—'} />
                <DetailRow label="Plate Number" value={result.booking.plate_number || '—'} />
                <DetailRow label="Pickup Date" value={result.booking.pickup_date || '—'} />
                <DetailRow label="Return Date" value={result.booking.return_date || '—'} />
                <DetailRow label="Pickup Location" value={result.booking.pickup_location || '—'} />
                <DetailRow label="Dropoff Location" value={result.booking.dropoff_location || '—'} />
              </div>
            )}
          </div>

          <div className="bg-blue-800 text-white px-6 py-3 mt-10 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold">ABELIZA CAR RENTALS</p>
              <p className="text-[10px] text-blue-200 mt-0.5">
                123 Rental Street, Salalah Oman &nbsp;|&nbsp; info@abeliza.com &nbsp;|&nbsp; +96896069582
              </p>
            </div>
            <p className="text-[10px]">Thank you for booking with us.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
