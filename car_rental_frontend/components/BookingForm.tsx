'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import apiService from '@/app/services/apiService'
import PaymentModal from './Paymentmodal'

const isAuthenticated = () =>
  typeof document !== 'undefined' && document.cookie.includes('session_access_token=')

const pendingBookingKey = (carId: number) => `pendingBooking_${carId}`

interface BookingReceipt {
  booking_id: string | number
  car_id: number
  total_price: string
  plate_number: string
  car_name: string
  pickup_date: string
  return_date: string
  pickup_location: string
  dropoff_location: string
  driving_license_no: string
  date_of_birth: string
  passport_no: string
  email: string
  gsm: string
  nationality: string
  issued_at: string
  issued_on: string
  valid_up_to: string
  address: string
}

const BookingForm = ({ carId }: { carId: number }) => {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [bookingId, setBookingId] = useState<number | null>(null)
  const [bookedRanges, setBookedRanges] = useState<{ start: string; end: string }[]>([])
  const [dateError, setDateError] = useState('')
  const [resumedNotice, setResumedNotice] = useState(false)

  const [form, setForm] = useState({
    pickup_date: '',
    return_date: '',
    pickup_location: '',
    dropoff_location: '',
    driving_license_no: '',
    issued_at: '',
    issued_on: '',
    valid_up_to: '',
    nationality: '',
    date_of_birth: '',
    passport_no: '',
    email: '',
    address: '',
    gsm: '',
  })

  // ── Restore a booking in progress if the user got sent to sign in ────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(pendingBookingKey(carId))
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.form) setForm((prev) => ({ ...prev, ...parsed.form }))
        if (parsed?.step) setStep(parsed.step)
        localStorage.removeItem(pendingBookingKey(carId))
        if (isAuthenticated()) setResumedNotice(true)
      }
    } catch (err) {
      console.error('Failed to restore pending booking:', err)
    }
  }, [carId])

  // ── Fetch booked dates for this car ───────────────────────
  useEffect(() => {
    const fetchBookedDates = async () => {
      try {
        const data = await apiService.get('/bookings/')
        const bookings = Array.isArray(data) ? data : data?.results ?? []
        const ranges = bookings
          .filter((b: any) =>
            // only bookings for THIS car, exclude cancelled
            (b.car === carId || b.car_id === carId) &&
            !['cancelled', 'rejected'].includes(b.status)
          )
          .map((b: any) => ({ start: b.pickup_date, end: b.return_date }))
        setBookedRanges(ranges)
      } catch (err) {
        console.error('Failed to fetch booked dates:', err)
      }
    }
    fetchBookedDates()
  }, [carId])

  // ── Date helpers — defined BEFORE handleChange ────────────
  const isDateInBookedRange = (dateStr: string): boolean => {
    if (!dateStr || bookedRanges.length === 0) return false
    return bookedRanges.some(({ start, end }) => dateStr >= start && dateStr <= end)
  }

  const rangeOverlapsBookings = (start: string, end: string): boolean => {
    if (!start || !end || bookedRanges.length === 0) return false
    return bookedRanges.some((r) => start <= r.end && end >= r.start)
  }

  const getBookedDatesText = (): string =>
    bookedRanges.map((r) => `${r.start} → ${r.end}`).join(', ')

  // ── handleChange ──────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === 'pickup_date' || name === 'return_date') {
      // Check if the single date falls inside a booked range
      if (isDateInBookedRange(value)) {
        setDateError(`This date is already booked. Booked periods: ${getBookedDatesText()}`)
        return
      }

      // Check if the full pickup→return range overlaps any booking
      const newPickup = name === 'pickup_date' ? value : form.pickup_date
      const newReturn = name === 'return_date' ? value : form.return_date

      if (newPickup && newReturn && rangeOverlapsBookings(newPickup, newReturn)) {
        setDateError(`Your selected range overlaps a booking. Booked: ${getBookedDatesText()}`)
        return
      }

      setDateError('')
    }

    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const nextStep = () => setStep((prev) => prev + 1)
  const prevStep = () => setStep((prev) => prev - 1)

  const handleSubmit = async () => {
    if (!isAuthenticated()) {
      localStorage.setItem(pendingBookingKey(carId), JSON.stringify({ form, step: 3 }))
      router.push(`/sign-in?next=${encodeURIComponent('/booking/' + carId)}`)
      return
    }
    try {
      setLoading(true)
      const data = await apiService.post('/bookings/', { car: carId, ...form })
      setReceipt({
        booking_id: data?.id ?? data?.booking_id ?? '—',
        car_id: carId,
        plate_number: data?.plate_number ?? '—',
        car_name: data?.car_name ?? '—',
        total_price: data?.total_price ?? '—',
        ...form,
      })
      setBookingId(data.id)
      setShowPayment(true)
    } catch (error: any) {
      alert(error?.message || 'Error creating booking')
    } finally {
      setLoading(false)
    }
  }

  const downloadReceipt = async () => {
    if (!receipt) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    const headerHeight = 62
    doc.setFillColor(30, 64, 175)
    doc.rect(0, 0, pageWidth, headerHeight, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ABELIZA CAR RENTALS', pageWidth / 2, 16, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('BOOKING RECEIPT', pageWidth / 2, 25, { align: 'center' })
    doc.setFontSize(8)
    doc.setTextColor(186, 210, 255)
    doc.text('123 Rental Street, Salalah, Oman', 14, 42)
    doc.text('info@abeliza.com', pageWidth / 2, 42, { align: 'center' })
    doc.text('+96896069582', pageWidth - 14, 42, { align: 'right' })
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, headerHeight + 8, { align: 'right' })

    doc.setFillColor(239, 246, 255)
    doc.rect(0, headerHeight + 4, pageWidth, 14, 'F')
    doc.setTextColor(30, 64, 175)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(
      `Booking ID: #${receipt.booking_id}   Car: ${receipt.car_name}   Plate: ${receipt.plate_number}   Total: OMR ${receipt.total_price}`,
      pageWidth / 2,
      headerHeight + 13,
      { align: 'center' }
    )

    let y = headerHeight + 28

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

    drawSection('Trip Details', [
      ['Pickup Date', receipt.pickup_date],
      ['Return Date', receipt.return_date],
      ['Pickup Location', receipt.pickup_location],
      ['Dropoff Location', receipt.dropoff_location],
      ['Total Price', `OMR ${receipt.total_price}`],
    ])
    drawSection('Driver Details', [
      ['Driving License No', receipt.driving_license_no],
      ['Issued At', receipt.issued_at],
      ['Issued On', receipt.issued_on],
      ['Valid Up To', receipt.valid_up_to],
      ['Nationality', receipt.nationality],
      ['Date of Birth', receipt.date_of_birth],
    ])
    drawSection('Contact Information', [
      ['Passport No', receipt.passport_no],
      ['Email', receipt.email],
      ['Address', receipt.address],
      ['GSM', receipt.gsm],
    ])

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
    doc.text('Thank you for your booking. Please keep this receipt for your records.', pageWidth - 14, pageHeight - footerHeight + 17, { align: 'right' })
    doc.save(`booking-receipt-${receipt.booking_id}.pdf`)
  }

  const resetForm = () => {
    setForm({
      pickup_date: '', return_date: '', pickup_location: '', dropoff_location: '',
      driving_license_no: '', issued_at: '', issued_on: '', valid_up_to: '',
      nationality: '', date_of_birth: '', passport_no: '', email: '', address: '', gsm: '',
    })
    setReceipt(null)
    setStep(1)
    setDateError('')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className='bg-white p-6 rounded-xl shadow-md flex flex-col gap-4'>
      <h2 className='text-xl font-bold'>Book This Car</h2>

      {resumedNotice && (
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700'>
          ✅ Welcome back! We restored your booking details — pick up where you left off.
        </div>
      )}

      {/* STEP INDICATOR */}
      <div className='flex gap-2 text-sm font-medium'>
        {['Trip', 'Driver', 'Contact', 'Receipt'].map((s, i) => (
          <span key={s} className='flex items-center gap-2'>
            <span className={step === i + 1 ? 'text-blue-600 font-bold' : 'text-gray-400'}>{s}</span>
            {i < 3 && <span className='text-gray-300'>→</span>}
          </span>
        ))}
      </div>

      {/* ================= STEP 1 ================= */}
      {step === 1 && (
        <>
          <Input
            label="Pickup Date" name="pickup_date" type="date"
            value={form.pickup_date} onChange={handleChange} min={today}
          />
          <Input
            label="Return Date" name="return_date" type="date"
            value={form.return_date} onChange={handleChange}
            min={form.pickup_date || today}
          />
          <Input label="Pickup Location" name="pickup_location" value={form.pickup_location} onChange={handleChange} />
          <Input label="Dropoff Location" name="dropoff_location" value={form.dropoff_location} onChange={handleChange} />

          {/* Booked dates info */}
          {bookedRanges.length > 0 && (
            <div className='bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800'>
              <p className='font-semibold mb-1'>⚠ This car is already booked on:</p>
              {bookedRanges.map((r, i) => (
                <p key={i} className='font-mono'>{r.start} → {r.end}</p>
              ))}
            </div>
          )}

          {/* Date conflict error */}
          {dateError && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600'>
              ❌ {dateError}
            </div>
          )}

          <Button
            onClick={nextStep}
            text="Next"
            disabled={!!dateError || !form.pickup_date || !form.return_date || !form.pickup_location || !form.dropoff_location}
          />
        </>
      )}

      {/* ================= STEP 2 ================= */}
      {step === 2 && (
        <>
          <Input label="Driving License No" name="driving_license_no" value={form.driving_license_no} onChange={handleChange} />
          <Input label="Issued At" name="issued_at" value={form.issued_at} onChange={handleChange} />
          <Input label="Issued On" name="issued_on" type="date" value={form.issued_on} onChange={handleChange} />
          <Input label="Valid Up To" name="valid_up_to" type="date" value={form.valid_up_to} onChange={handleChange} />
          <Input label="Nationality" name="nationality" value={form.nationality} onChange={handleChange} />
          <Input label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
          <div className='flex justify-between'>
            <Button onClick={prevStep} text="Back" secondary />
            <Button onClick={nextStep} text="Next" />
          </div>
        </>
      )}

      {/* ================= STEP 3 ================= */}
      {step === 3 && (
        <>
          <Input label="Passport No" name="passport_no" value={form.passport_no} onChange={handleChange} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
          <Input label="Address" name="address" value={form.address} onChange={handleChange} />
          <Input label="GSM" name="gsm" value={form.gsm} onChange={handleChange} />
          <div className='flex justify-between'>
            <Button onClick={prevStep} text="Back" secondary />
            <Button onClick={handleSubmit} text={loading ? 'Processing...' : 'Submit Booking'} />
          </div>
        </>
      )}

      {/* ================= STEP 4 — RECEIPT ================= */}
      {step === 4 && receipt && (
        <div className='flex flex-col gap-4'>
          <div className='bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3'>
            <span className='text-green-600 text-2xl'>✓</span>
            <div>
              <p className='font-semibold text-green-800'>Booking Confirmed & Paid!</p>
              <p className='text-sm text-green-600'>Booking ID: <span className='font-bold'>#{receipt.booking_id}</span></p>
            </div>
          </div>
          <div className='border rounded-lg overflow-hidden text-sm'>
            <div className='bg-blue-800 text-white px-4 py-2 font-semibold'>Receipt Summary</div>
            <ReceiptSection title="Car">
              <ReceiptRow label="Car Name" value={receipt.car_name} />
              <ReceiptRow label="Car Number" value={receipt.plate_number} />
              <ReceiptRow label="Total Price" value={`OMR ${receipt.total_price}`} />
            </ReceiptSection>
            <ReceiptSection title="Trip Details">
              <ReceiptRow label="Pickup Date" value={receipt.pickup_date} />
              <ReceiptRow label="Return Date" value={receipt.return_date} />
              <ReceiptRow label="Pickup Location" value={receipt.pickup_location} />
              <ReceiptRow label="Dropoff Location" value={receipt.dropoff_location} />
            </ReceiptSection>
            <ReceiptSection title="Driver Details">
              <ReceiptRow label="License No" value={receipt.driving_license_no} />
              <ReceiptRow label="Date of Birth" value={receipt.date_of_birth} />
              <ReceiptRow label="Nationality" value={receipt.nationality} />
            </ReceiptSection>
            <ReceiptSection title="Contact Info">
              <ReceiptRow label="Passport No" value={receipt.passport_no} />
              <ReceiptRow label="Email" value={receipt.email} />
              <ReceiptRow label="GSM" value={receipt.gsm} />
            </ReceiptSection>
          </div>
          <button onClick={downloadReceipt} className='w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2'>
            <span>⬇</span> Download PDF Receipt
          </button>
          <button onClick={resetForm} className='w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition'>
            Make Another Booking
          </button>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {showPayment && bookingId && (
        <PaymentModal
          bookingId={bookingId}
          carId={carId}
          pickupDate={form.pickup_date}
          returnDate={form.return_date}
          onSuccess={(ref: string, invoice: string) => {
            setShowPayment(false)
            setStep(4)
          }}
          onClose={() => {
            setShowPayment(false)
            setStep(4)
          }}
        />
      )}
    </div>
  )
}

/* ── Helpers ── */
const ReceiptSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className='bg-gray-50 px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide border-y'>{title}</div>
    <div className='divide-y'>{children}</div>
  </div>
)

const ReceiptRow = ({ label, value }: { label: string; value: string }) => (
  <div className='flex justify-between px-4 py-2'>
    <span className='text-gray-500'>{label}</span>
    <span className='font-medium text-gray-800'>{value || '—'}</span>
  </div>
)

const Input = ({ label, name, value, onChange, type = 'text', min }: {
  label: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string; min?: string
}) => (
  <div>
    <label className='font-medium text-sm'>{label}</label>
    <input
      type={type} name={name} value={value} onChange={onChange} min={min}
      className='w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400'
    />
  </div>
)

const Button = ({ onClick, text, secondary = false, disabled = false }: {
  onClick: () => void; text: string; secondary?: boolean; disabled?: boolean
}) => (
  <button
    onClick={onClick} disabled={disabled}
    className={`py-3 px-4 rounded-lg font-semibold transition ${
      secondary ? 'bg-gray-200 text-black hover:bg-gray-300' :
      disabled ? 'bg-blue-300 text-white cursor-not-allowed' :
      'bg-blue-600 text-white hover:bg-blue-700'
    }`}
  >
    {text}
  </button>
)

export default BookingForm







// 'use client'

// import {useState, useEffect, useRef } from 'react'
// import apiService from '@/app/services/apiService'
// import PaymentModal from './Paymentmodal'

// interface BookingReceipt {
//   booking_id: string | number
//   car_id: number
//   total_price: string
//   plate_number: string
//   car_name: string
//   pickup_date: string
//   return_date: string
//   pickup_location: string
//   dropoff_location: string
//   driving_license_no: string
//   date_of_birth: string
//   passport_no: string
//   email: string
//   gsm: string
//   nationality: string
//   issued_at: string
//   issued_on: string
//   valid_up_to: string
//   address: string
// }

// const BookingForm = ({ carId }: { carId: number }) => {
//   const [step, setStep] = useState(1)
//   const [loading, setLoading] = useState(false)
//   const [receipt, setReceipt] = useState<BookingReceipt | null>(null)
//   const [showPayment, setShowPayment] = useState(false)
//   const [bookingId, setBookingId] = useState<number | null>(null)

// // Add inside the component, after existing state declarations:
// const [bookedRanges, setBookedRanges] = useState<{ start: string; end: string }[]>([])
// const [dateError, setDateError] = useState('')

//   const [form, setForm] = useState({
//     pickup_date: '',
//     return_date: '',
//     pickup_location: '',
//     dropoff_location: '',
//     driving_license_no: '',
//     issued_at: '',
//     issued_on: '',
//     valid_up_to: '',
//     nationality: '',
//     date_of_birth: '',
//     passport_no: '',
//     email: '',
//     address: '',
//     gsm: '',
//   })

  
//  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//   const { name, value } = e.target

//   if (name === 'pickup_date' || name === 'return_date') {
//     if (isDateInBookedRange(value)) {
//       setDateError(`This date is already booked. Booked periods: ${getBookedDatesForInput()}`)
//       return // don't update the form
//     }
//     // Also check if range overlaps
//     if (name === 'return_date' && form.pickup_date) {
//       const overlaps = bookedRanges.some(({ start, end }) =>
//         form.pickup_date <= end && value >= start
//       )
//       if (overlaps) {
//         setDateError(`Your selected range overlaps with an existing booking. Booked: ${getBookedDatesForInput()}`)
//         return
//       }
//     }
//     if (name === 'pickup_date' && form.return_date) {
//       const overlaps = bookedRanges.some(({ start, end }) =>
//         value <= end && form.return_date >= start
//       )
//       if (overlaps) {
//         setDateError(`Your selected range overlaps with an existing booking. Booked: ${getBookedDatesForInput()}`)
//         return
//       }
//     }
//     setDateError('')
//   }

//   setForm({ ...form, [name]: value })
// }

//   const nextStep = () => setStep((prev) => prev + 1)
//   const prevStep = () => setStep((prev) => prev - 1)

//   const handleSubmit = async () => {
//     try {
//       setLoading(true)

//       const data = await apiService.post('/bookings/', {
//         car: carId,
//         ...form,
//       })

//       // Build receipt from response + form data
//       setReceipt({
//         booking_id: data?.id ?? data?.booking_id ?? '—',
//         car_id: carId,
//         plate_number: data?.plate_number ?? '—',
//         car_name: data?.car_name ?? '—',
//         total_price: data?.total_price ?? '—',
//         ...form,
//       })

//       // Store booking ID and open payment modal
//       setBookingId(data.id)
//       setShowPayment(true)

//     } catch (error: any) {
//       // apiService throws plain Error — use error.message directly
//       const message = error?.message || 'Error creating booking'
//       alert(message)
//     } finally {
//       setLoading(false)
//     }
//   }

//   const downloadReceipt = async () => {
//     if (!receipt) return
//     const { default: jsPDF } = await import('jspdf')
//     const doc = new jsPDF()
//     const pageWidth = doc.internal.pageSize.getWidth()

//     const logoBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCACUAOkDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD8qaKKK9M8kKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/2Q=='

//     // ── Header ──────────────────────────────────────────────
//     const headerHeight = 62
//     doc.setFillColor(30, 64, 175)
//     doc.rect(0, 0, pageWidth, headerHeight, 'F')
//     doc.addImage(logoBase64, 'JPEG', 14, 10, 22, 22)
//     doc.setTextColor(255, 255, 255)
//     doc.setFontSize(16)
//     doc.setFont('helvetica', 'bold')
//     doc.text('ABELIZA CAR RENTALS', pageWidth / 2, 16, { align: 'center' })
//     doc.setFontSize(10)
//     doc.setFont('helvetica', 'normal')
//     doc.text('BOOKING RECEIPT', pageWidth / 2, 25, { align: 'center' })
//     doc.setFontSize(8)
//     doc.setTextColor(186, 210, 255)
//     doc.text('123 Rental Street, Salalah, Oman', 14, 42)
//     doc.text('info@abeliza.com', pageWidth / 2, 42, { align: 'center' })
//     doc.text('+96896069582', pageWidth - 14, 42, { align: 'right' })
//     doc.setTextColor(100, 100, 100)
//     doc.setFontSize(8)
//     doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, headerHeight + 8, { align: 'right' })

//     // ── Booking reference banner ────────────────────────────
//     doc.setFillColor(239, 246, 255)
//     doc.rect(0, headerHeight + 4, pageWidth, 14, 'F')
//     doc.setTextColor(30, 64, 175)
//     doc.setFontSize(9)
//     doc.setFont('helvetica', 'bold')
//     doc.text(
//       `Booking ID: #${receipt.booking_id}   Car: ${receipt.car_name}   Plate: ${receipt.plate_number}   Total: OMR ${receipt.total_price}`,
//       pageWidth / 2,
//       headerHeight + 13,
//       { align: 'center' }
//     )

//     let y = headerHeight + 28

//     const drawSection = (title: string, rows: [string, string][]) => {
//       doc.setFillColor(243, 244, 246)
//       doc.rect(14, y - 5, pageWidth - 28, 10, 'F')
//       doc.setTextColor(30, 64, 175)
//       doc.setFontSize(10)
//       doc.setFont('helvetica', 'bold')
//       doc.text(title.toUpperCase(), 18, y + 2)
//       y += 12
//       doc.setTextColor(50, 50, 50)
//       doc.setFont('helvetica', 'normal')
//       doc.setFontSize(10)
//       rows.forEach(([label, value]) => {
//         doc.setFont('helvetica', 'bold')
//         doc.text(`${label}:`, 18, y)
//         doc.setFont('helvetica', 'normal')
//         doc.text(value || '—', 80, y)
//         y += 8
//       })
//       y += 4
//     }

//     drawSection('Trip Details', [
//       ['Pickup Date', receipt.pickup_date],
//       ['Return Date', receipt.return_date],
//       ['Pickup Location', receipt.pickup_location],
//       ['Dropoff Location', receipt.dropoff_location],
//       ['Total Price', `OMR ${receipt.total_price}`],
//     ])

//     drawSection('Driver Details', [
//       ['Driving License No', receipt.driving_license_no],
//       ['Issued At', receipt.issued_at],
//       ['Issued On', receipt.issued_on],
//       ['Valid Up To', receipt.valid_up_to],
//       ['Nationality', receipt.nationality],
//       ['Date of Birth', receipt.date_of_birth],
//     ])

//     drawSection('Contact Information', [
//       ['Passport No', receipt.passport_no],
//       ['Email', receipt.email],
//       ['Address', receipt.address],
//       ['GSM', receipt.gsm],
//     ])

//     // ── Footer ──────────────────────────────────────────────
//     const pageHeight = doc.internal.pageSize.getHeight()
//     const footerHeight = 24
//     doc.setFillColor(30, 64, 175)
//     doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F')
//     doc.setTextColor(255, 255, 255)
//     doc.setFontSize(8)
//     doc.setFont('helvetica', 'bold')
//     doc.text('ABELIZA CAR RENTALS', 14, pageHeight - footerHeight + 9)
//     doc.setFont('helvetica', 'normal')
//     doc.setTextColor(186, 210, 255)
//     doc.text('123 Rental Street, Salalah Oman  |  info@abeliza.com  |  +96896069582', 14, pageHeight - footerHeight + 17)
//     doc.setTextColor(255, 255, 255)
//     doc.setFontSize(7)
//     doc.text('Thank you for your booking. Please keep this receipt for your records.', pageWidth - 14, pageHeight - footerHeight + 17, { align: 'right' })

//     doc.save(`booking-receipt-${receipt.booking_id}.pdf`)
//   }

//   const resetForm = () => {
//     setForm({
//       pickup_date: '',
//       return_date: '',
//       pickup_location: '',
//       dropoff_location: '',
//       driving_license_no: '',
//       issued_at: '',
//       issued_on: '',
//       valid_up_to: '',
//       nationality: '',
//       date_of_birth: '',
//       passport_no: '',
//       email: '',
//       address: '',
//       gsm: '',
//     })
//     setReceipt(null)
//     setStep(1)
//   }

//   useEffect(() => {
//   const fetchBookedDates = async () => {
//     try {
//       const data = await apiService.get(`/bookings/?car=${carId}`)
//       const bookings = Array.isArray(data) ? data : data?.results ?? []
//       const ranges = bookings
//         .filter((b: any) => !['cancelled', 'rejected'].includes(b.status))
//         .map((b: any) => ({ start: b.pickup_date, end: b.return_date }))
//       setBookedRanges(ranges)
//     } catch (err) {
//       console.error('Failed to fetch booked dates:', err)
//     }
//   }
//   fetchBookedDates()
// }, [carId])

// const isDateInBookedRange = (dateStr: string): boolean => {
//   if (!dateStr) return false
//   return bookedRanges.some(({ start, end }) => dateStr >= start && dateStr <= end)
// }

// const getBookedDatesForInput = (): string => {
//   // Returns comma-separated list for display purposes
//   return bookedRanges.map(r => `${r.start} to ${r.end}`).join(', ')
// }

//   return (
//     <div className='bg-white p-6 rounded-xl shadow-md flex flex-col gap-4'>
//       <h2 className='text-xl font-bold'>Book This Car</h2>

//       {/* STEP INDICATOR */}
//       <div className='flex gap-2 text-sm font-medium'>
//         <span className={step === 1 ? 'text-blue-600' : ''}>Trip</span>
//         <span>→</span>
//         <span className={step === 2 ? 'text-blue-600' : ''}>Driver</span>
//         <span>→</span>
//         <span className={step === 3 ? 'text-blue-600' : ''}>Contact</span>
//         <span>→</span>
//         <span className={step === 4 ? 'text-blue-600' : ''}>Receipt</span>
//       </div>

//       {/* ================= STEP 1 ================= */}

//       {step === 1 && (
//           <>
//             <Input label="Pickup Date" name="pickup_date" type="date"
//               value={form.pickup_date} onChange={handleChange}
//               min={new Date().toISOString().split('T')[0]}  // disable past dates
//             />
//             <Input label="Return Date" name="return_date" type="date"
//               value={form.return_date} onChange={handleChange}
//               min={form.pickup_date || new Date().toISOString().split('T')[0]}
//             />
//             <Input label="Pickup Location" name="pickup_location" value={form.pickup_location} onChange={handleChange} />
//             <Input label="Dropoff Location" name="dropoff_location" value={form.dropoff_location} onChange={handleChange} />

//             {/* ── Booked dates warning ── */}
//             {bookedRanges.length > 0 && (
//               <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700'>
//                 <p className='font-semibold mb-1'>⚠ Already booked dates for this car:</p>
//                 {bookedRanges.map((r, i) => (
//                   <p key={i}>{r.start} → {r.end}</p>
//                 ))}
//               </div>
//             )}

//             {/* ── Date conflict error ── */}
//             {dateError && (
//               <div className='bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600'>
//                 {dateError}
//               </div>
//             )}

//             <Button
//               onClick={nextStep}
//               text="Next"
//               disabled={!!dateError || !form.pickup_date || !form.return_date}
//             />
//           </>
//         )}
//       {/* {step === 1 && (
//         <>
//           <Input label="Pickup Date" name="pickup_date" type="date" value={form.pickup_date} onChange={handleChange} />
//           <Input label="Return Date" name="return_date" type="date" value={form.return_date} onChange={handleChange} />
//           <Input label="Pickup Location" name="pickup_location" value={form.pickup_location} onChange={handleChange} />
//           <Input label="Dropoff Location" name="dropoff_location" value={form.dropoff_location} onChange={handleChange} />
//           <Button onClick={nextStep} text="Next" />
//         </>
//       )} */}

//       {/* ================= STEP 2 ================= */}
//       {step === 2 && (
//         <>
//           <Input label="Driving License No" name="driving_license_no" value={form.driving_license_no} onChange={handleChange} />
//           <Input label="Issued At" name="issued_at" value={form.issued_at} onChange={handleChange} />
//           <Input label="Issued On" name="issued_on" type="date" value={form.issued_on} onChange={handleChange} />
//           <Input label="Valid Up To" name="valid_up_to" type="date" value={form.valid_up_to} onChange={handleChange} />
//           <Input label="Nationality" name="nationality" value={form.nationality} onChange={handleChange} />
//           <Input label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
//           <div className='flex justify-between'>
//             <Button onClick={prevStep} text="Back" secondary />
//             <Button onClick={nextStep} text="Next" />
//           </div>
//         </>
//       )}

//       {/* ================= STEP 3 ================= */}
//       {step === 3 && (
//         <>
//           <Input label="Passport No" name="passport_no" value={form.passport_no} onChange={handleChange} />
//           <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
//           <Input label="Address" name="address" value={form.address} onChange={handleChange} />
//           <Input label="GSM" name="gsm" value={form.gsm} onChange={handleChange} />
//           <div className='flex justify-between'>
//             <Button onClick={prevStep} text="Back" secondary />
//             <Button onClick={handleSubmit} text={loading ? 'Processing...' : 'Submit Booking'} />
//           </div>
//         </>
//       )}

//       {/* ================= STEP 4 — RECEIPT ================= */}
//       {step === 4 && receipt && (
//         <div className='flex flex-col gap-4'>
//           <div className='bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3'>
//             <span className='text-green-600 text-2xl'>✓</span>
//             <div>
//               <p className='font-semibold text-green-800'>Booking Confirmed & Paid!</p>
//               <p className='text-sm text-green-600'>Booking ID: <span className='font-bold'>#{receipt.booking_id}</span></p>
//             </div>
//           </div>

//           <div className='border rounded-lg overflow-hidden text-sm'>
//             <div className='bg-blue-800 text-white px-4 py-2 font-semibold'>Receipt Summary</div>
//             <ReceiptSection title="Car">
//               <ReceiptRow label="Car Name" value={receipt.car_name} />
//               <ReceiptRow label="Car Number" value={receipt.plate_number} />
//               <ReceiptRow label="Total Price" value={`OMR ${receipt.total_price}`} />
//             </ReceiptSection>
//             <ReceiptSection title="Trip Details">
//               <ReceiptRow label="Pickup Date" value={receipt.pickup_date} />
//               <ReceiptRow label="Return Date" value={receipt.return_date} />
//               <ReceiptRow label="Pickup Location" value={receipt.pickup_location} />
//               <ReceiptRow label="Dropoff Location" value={receipt.dropoff_location} />
//             </ReceiptSection>
//             <ReceiptSection title="Driver Details">
//               <ReceiptRow label="License No" value={receipt.driving_license_no} />
//               <ReceiptRow label="Date of Birth" value={receipt.date_of_birth} />
//               <ReceiptRow label="Nationality" value={receipt.nationality} />
//             </ReceiptSection>
//             <ReceiptSection title="Contact Info">
//               <ReceiptRow label="Passport No" value={receipt.passport_no} />
//               <ReceiptRow label="Email" value={receipt.email} />
//               <ReceiptRow label="GSM" value={receipt.gsm} />
//             </ReceiptSection>
//           </div>

//           <button
//             onClick={downloadReceipt}
//             className='w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2'
//           >
//             <span>⬇</span> Download PDF Receipt
//           </button>

//           <button
//             onClick={resetForm}
//             className='w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition'
//           >
//             Make Another Booking
//           </button>
//         </div>
//       )}

//       {/* ── Payment Modal — rendered OUTSIDE steps, as an overlay ── */}
//       {showPayment && bookingId && (
//         <PaymentModal
//           bookingId={bookingId}
//           carId={carId}
//           pickupDate={form.pickup_date}
//           returnDate={form.return_date}
//           onSuccess={(ref: string, invoice: string) => {
//             setShowPayment(false)
//             setStep(4) // go to receipt AFTER payment succeeds
//           }}
//           onClose={() => {
//             setShowPayment(false)
//             // If user closes without paying, still show receipt but unpaid
//             setStep(4)
//           }}
//         />
//       )}
//     </div>
//   )
// }

// /* ================= RECEIPT HELPERS ================= */
// const ReceiptSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
//   <div>
//     <div className='bg-gray-50 px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide border-y'>
//       {title}
//     </div>
//     <div className='divide-y'>{children}</div>
//   </div>
// )

// const ReceiptRow = ({ label, value }: { label: string; value: string }) => (
//   <div className='flex justify-between px-4 py-2'>
//     <span className='text-gray-500'>{label}</span>
//     <span className='font-medium text-gray-800'>{value || '—'}</span>
//   </div>
// )

// const Input = ({ label, name, value, onChange, type = 'text', min }: {
//   label: string; name: string; value: string
//   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
//   type?: string; min?: string
// }) => (
//   <div>
//     <label className='font-medium'>{label}</label>
//     <input
//       type={type}
//       name={name}
//       value={value}
//       onChange={onChange}
//       min={min}
//       className='w-full border rounded-lg p-3 mt-1 disabled:bg-gray-100'
//     />
//   </div>
// )

// const Button = ({ onClick, text, secondary = false, disabled = false }: {
//   onClick: () => void; text: string; secondary?: boolean; disabled?: boolean
// }) => (
//   <button
//     onClick={onClick}
//     disabled={disabled}
//     className={`py-3 px-4 rounded-lg font-semibold transition ${
//       secondary ? 'bg-gray-200 text-black' :
//       disabled ? 'bg-blue-300 text-white cursor-not-allowed' :
//       'bg-blue-600 text-white hover:bg-blue-700'
//     }`}
//   >
//     {text}
//   </button>
// )
// export default BookingForm

// const Input = ({ label, name, value, onChange, type = 'text' }: any) => (
//   <div>
//     <label className='font-medium'>{label}</label>
//     <input
//       type={type}
//       name={name}
//       value={value}
//       onChange={onChange}
//       className='w-full border rounded-lg p-3 mt-1'
//     />
//   </div>
// )

// const Button = ({ onClick, text, secondary = false }: any) => (
//   <button
//     onClick={onClick}
//     className={`py-3 px-4 rounded-lg font-semibold transition ${
//       secondary ? 'bg-gray-200 text-black' : 'bg-blue-600 text-white hover:bg-blue-700'
//     }`}
//   >
//     {text}
//   </button>
// )




// 'use client'

// import { useState } from 'react'
// import apiService from '@/app/services/apiService'
// import PaymentModal from './Paymentmodal'
// import { useRouter } from 'next/navigation'
// // import jsPDF from 'jspdf'

// interface BookingReceipt {
//   booking_id: string | number
//   car_id: number
//   total_price: string
//   plate_number: string
//   car_name: string
//   pickup_date: string
//   return_date: string
//   pickup_location: string
//   dropoff_location: string
//   driving_license_no: string
//   date_of_birth: string
//   passport_no: string
//   email: string
//   gsm: string
//   nationality: string
//   issued_at: string
//   issued_on: string
//   valid_up_to: string
//   address: string
// }

// const BookingForm = ({ carId }: { carId: number }) => {
//   const [step, setStep] = useState(1)
//   const [loading, setLoading] = useState(false)
//   const [receipt, setReceipt] = useState<BookingReceipt | null>(null)
//   const [showPayment, setShowPayment] = useState(false)
//   const [bookingId, setBookingId] = useState<number | null>(null)
//   const router = useRouter()
//   const [form, setForm] = useState({
//     pickup_date: '',
//     return_date: '',
//     pickup_location: '',
//     dropoff_location: '',

//     driving_license_no: '',
//     issued_at: '',
//     issued_on: '',
//     valid_up_to: '',
//     nationality: '',
//     date_of_birth: '',

//     passport_no: '',
//     email: '',
//     address: '',
//     gsm: '',
//   })

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setForm({
//       ...form,
//       [e.target.name]: e.target.value,
//     })
//   }

//   const nextStep = () => setStep((prev) => prev + 1)
//   const prevStep = () => setStep((prev) => prev - 1)

//   const handleSubmit = async () => {
//     try {
//       setLoading(true)

//       const data = await apiService.post('/bookings/', {
//         car: carId,
//         ...form,
//       })
//       console.log('Booking response:', data)

//       // Build receipt from response + form data
//       setReceipt({
//         booking_id: data?.id ?? data?.booking_id ?? '—',
//         car_id: carId,
//         plate_number: data?.plate_number ?? '—',
//         car_name: data?.car_name ?? '—',
//         total_price: data?.total_price ?? '—',
//         ...form,
//       })
//        setBookingId(data.id)
//       setShowPayment(true)

//       // setStep(4) // move to receipt step
//     } catch (error: any) {
//       const message =
//         error?.response?.data?.detail ||
//         error?.message ||
//         'Error creating booking'
//       alert(message)
//     } finally {
//       setLoading(false)
//     }
//   }

//   // At the top of downloadReceipt, load your logo

 
//   const downloadReceipt = async () => {
//   if (!receipt) return
//     const { default: jsPDF } = await import('jspdf')
//     const doc = new jsPDF()

//     const pageWidth = doc.internal.pageSize.getWidth()

// const logoBase64 = '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' // your base64 string
//  doc.addImage(logoBase64, 'PNG', 14, 8, 28, 28)

// // ── Header ──────────────────────────────────────────────
// const headerHeight = 62
// doc.setFillColor(30, 64, 175)
// doc.rect(0, 0, pageWidth, headerHeight, 'F')

// // Logo (if you have one as base64, add it here)
// doc.addImage(logoBase64, 'PNG', 14, 8, 24, 24)

// // Company name
// doc.setTextColor(255, 255, 255)
// doc.setFontSize(16)
// doc.setFont('helvetica', 'bold')
// doc.text('ABELIZA CAR RENTALS', pageWidth / 2, 16, { align: 'center' })

// // Tagline / receipt label
// doc.setFontSize(10)
// doc.setFont('helvetica', 'normal')
// doc.text('BOOKING RECEIPT', pageWidth / 2, 25, { align: 'center' })

// // Address | Email | Phone — spaced across the bottom of the header
// doc.setFontSize(8)
// doc.setTextColor(186, 210, 255) // lighter blue for subtlety
// doc.text('123 Rental Street, Salalah, Oman', 14, 42)
// doc.text('info@abeliza.com', pageWidth / 2, 42, { align: 'center' })
// doc.text('+96896069582', pageWidth - 14, 42, { align: 'right' })

// // Generated date below header
// doc.setTextColor(100, 100, 100)
// doc.setFontSize(8)
// doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, headerHeight + 8, { align: 'right' })
    

// // doc.setFillColor(30, 64, 175) // blue-800
//     // doc.rect(0, 0, pageWidth, 36, 'F')

//     // doc.setTextColor(255, 255, 255)
//     // doc.setFontSize(20)
//     // doc.setFont('helvetica', 'bold')
//     // doc.text('BOOKING RECEIPT FROM ABELIZA CAR RENTALS', pageWidth / 2, 18, { align: 'center' })

//     // doc.setFontSize(10)
//     // doc.setFont('helvetica', 'normal')
//     // doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' })


//     // ── Booking reference banner ────────────────────────────
// doc.setFillColor(239, 246, 255)
// doc.rect(0, headerHeight + 4, pageWidth, 14, 'F')   // ← was headerHeight + 12
// doc.setTextColor(30, 64, 175)
// doc.setFontSize(10)
// doc.setFont('helvetica', 'bold')
// doc.text(
//   `Booking ID: #${receipt.booking_id}  Car Name: ${receipt.car_name}      Car ID: ${receipt.car_id}     Car Number: ${receipt.plate_number}`,
//   pageWidth / 2,
//   headerHeight + 13,  // ← was headerHeight + 21
//   { align: 'center' }
// )

// // ── Section content starts here
// let y = headerHeight + 28   // ← was headerHeight + 36

//     // doc.setFillColor(239, 246, 255) // blue-50
//     // doc.rect(0, 36, pageWidth, 18, 'F')
//     // doc.setTextColor(30, 64, 175)
//     // doc.setFontSize(11)
//     // doc.setFont('helvetica', 'bold')
//     // doc.text(`Booking ID: #${receipt.booking_id}     Car ID: ${receipt.car_id}     Car Number: ${receipt.plate_number}`, pageWidth / 2, 48, { align: 'center' })

//     // // ── Section helper ──────────────────────────────────────
//     // let y = 68

//     const drawSection = (title: string, rows: [string, string][]) => {
//       // Section title
//       doc.setFillColor(243, 244, 246) // gray-100
//       doc.rect(14, y - 5, pageWidth - 28, 10, 'F')
//       doc.setTextColor(30, 64, 175)
//       doc.setFontSize(10)
//       doc.setFont('helvetica', 'bold')
//       doc.text(title.toUpperCase(), 18, y + 2)
//       y += 12

//       doc.setTextColor(50, 50, 50)
//       doc.setFont('helvetica', 'normal')
//       doc.setFontSize(10)

//       rows.forEach(([label, value]) => {
//         doc.setFont('helvetica', 'bold')
//         doc.text(`${label}:`, 18, y)
//         doc.setFont('helvetica', 'normal')
//         doc.text(value || '—', 80, y)
//         y += 8
//       })

//       y += 4 // gap after section
//     }

//     drawSection('Trip Details', [
//       ['Pickup Date', receipt.pickup_date],
//       ['Return Date', receipt.return_date],
//       ['Pickup Location', receipt.pickup_location],
//       ['Dropoff Location', receipt.dropoff_location],
//       ['Total Price', receipt.total_price],
//     ])

//     drawSection('Driver Details', [
//       ['Driving License No', receipt.driving_license_no],
//       ['Issued At', receipt.issued_at],
//       ['Issued On', receipt.issued_on],
//       ['Valid Up To', receipt.valid_up_to],
//       ['Nationality', receipt.nationality],
//       ['Date of Birth', receipt.date_of_birth],
//     ])

//     drawSection('Contact Information', [
//       ['Passport No', receipt.passport_no],
//       ['Email', receipt.email],
//       ['Address', receipt.address],
//       ['GSM', receipt.gsm],
//     ])

//   // ── Footer ──────────────────────────────────────────────
// const pageHeight = doc.internal.pageSize.getHeight()
// const footerHeight = 24
// doc.setFillColor(30, 64, 175)
// doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F')

// doc.setTextColor(255, 255, 255)
// doc.setFontSize(8)
// doc.setFont('helvetica', 'bold')
// doc.text('ABELIZA CAR RENTALS', 14, pageHeight - footerHeight + 9)

// doc.setFont('helvetica', 'normal')
// doc.setTextColor(186, 210, 255)
// doc.text('123 Rental Street, Salalah Oman  |  info@abeliza.com  |  +96896069582', 14, pageHeight - footerHeight + 17)

// doc.setTextColor(255, 255, 255)
// doc.setFontSize(7)
// doc.text('Thank you for your booking. Please keep this receipt for your records.', pageWidth - 14, pageHeight - footerHeight + 17, { align: 'right' })

// doc.save(`booking-receipt-${receipt.booking_id}.pdf`)
//   //   const pageHeight = doc.internal.pageSize.getHeight()
//   //   doc.setFillColor(30, 64, 175)
//   //   doc.rect(0, pageHeight - 16, pageWidth, 16, 'F')
//   //   doc.setTextColor(255, 255, 255)
//   //   doc.setFontSize(9)
//   //   doc.setFont('helvetica', 'normal')
//   //   doc.text('Thank you for your booking. Please keep this receipt for your records.', pageWidth / 2, pageHeight - 6, { align: 'center' })

//   //   doc.save(`booking-receipt-${receipt.booking_id}.pdf`)
//   }

//   const resetForm = () => {
//     setForm({
//       pickup_date: '',
//       return_date: '',
//       pickup_location: '',
//       dropoff_location: '',
//       driving_license_no: '',
//       issued_at: '',
//       issued_on: '',
//       valid_up_to: '',
//       nationality: '',
//       date_of_birth: '',
//       passport_no: '',
//       email: '',
//       address: '',
//       gsm: '',
//     })
//     setReceipt(null)
//     setStep(1)
//   }

//   return (
//     <div className='bg-white p-6 rounded-xl shadow-md flex flex-col gap-4'>
//       <h2 className='text-xl font-bold'>Book This Car</h2>

//       {/* STEP INDICATOR */}
//       <div className='flex gap-2 text-sm font-medium'>
//         <span className={step === 1 ? 'text-blue-600' : ''}>Trip</span>
//         <span>→</span>
//         <span className={step === 2 ? 'text-blue-600' : ''}>Driver</span>
//         <span>→</span>
//         <span className={step === 3 ? 'text-blue-600' : ''}>Contact</span>
//         <span>→</span>
//         <span className={step === 4 ? 'text-blue-600' : ''}>Receipt</span>
//       </div>

//       {/* ================= STEP 1 ================= */}
//       {step === 1 && (
//         <>
//           <Input label="Pickup Date" name="pickup_date" type="date" value={form.pickup_date} onChange={handleChange} />
//           <Input label="Return Date" name="return_date" type="date" value={form.return_date} onChange={handleChange} />
//           <Input label="Pickup Location" name="pickup_location" value={form.pickup_location} onChange={handleChange} />
//           <Input label="Dropoff Location" name="dropoff_location" value={form.dropoff_location} onChange={handleChange} />

//           <Button onClick={nextStep} text="Next" />
//         </>
//       )}

//       {/* ================= STEP 2 ================= */}
//       {step === 2 && (
//         <>
//           <Input label="Driving License No" name="driving_license_no" value={form.driving_license_no} onChange={handleChange} />
//           <Input label="Issued At" name="issued_at" value={form.issued_at} onChange={handleChange} />
//           <Input label="Issued On" name="issued_on" type="date" value={form.issued_on} onChange={handleChange} />
//           <Input label="Valid Up To" name="valid_up_to" type="date" value={form.valid_up_to} onChange={handleChange} />
//           <Input label="Nationality" name="nationality" value={form.nationality} onChange={handleChange} />
//           <Input label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />

//           <div className='flex justify-between'>
//             <Button onClick={prevStep} text="Back" secondary />
//             <Button onClick={nextStep} text="Next" />
//           </div>
//         </>
//       )}

//       {/* ================= STEP 3 ================= */}
//       {step === 3 && (
//         <>
//           <Input label="Passport No" name="passport_no" value={form.passport_no} onChange={handleChange} />
//           <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
//           <Input label="Address" name="address" value={form.address} onChange={handleChange} />
//           <Input label="GSM" name="gsm" value={form.gsm} onChange={handleChange} />

//           <div className='flex justify-between'>
//             <Button onClick={prevStep} text="Back" secondary />
//             <Button onClick={handleSubmit} text={loading ? 'Processing...' : 'Submit Booking'} />
//           </div>
//         </>
//       )}

//       {/* ================= STEP 4 — RECEIPT ================= */}
//       {step === 4 && receipt && (
//         <div className='flex flex-col gap-4'>
//           {/* Success banner */}
//           <div className='bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3'>
//             <span className='text-green-600 text-2xl'>✓</span>
//             <div>
//               <p className='font-semibold text-green-800'>Booking Confirmed!</p>
//               <p className='text-sm text-green-600'>Booking ID: <span className='font-bold'>#{receipt.booking_id}</span></p>
//             </div>
//           </div>

//            {showPayment && bookingId && (
//           <PaymentModal
//             bookingId={bookingId}
//             carId={carId}
//             pickupDate={form.pickup_date}
//             returnDate={form.return_date}
//             onSuccess={(ref, invoice) => {
//               setShowPayment(false)
//               setStep(4) // now go to receipt step after payment
//             }}
//             onClose={() => setShowPayment(false)}
//           />
//         )}

//           {/* Receipt preview */}
//           <div className='border rounded-lg overflow-hidden text-sm'>
//             <div className='bg-blue-800 text-white px-4 py-2 font-semibold'>Receipt Summary</div>

//             <ReceiptSection title="Car">
//               <ReceiptRow label="Car ID" value={String(receipt.car_id)} />
//               <ReceiptRow label="Car Number" value={receipt.plate_number} />
//               <ReceiptRow label="Car Name" value={receipt.car_name} />
//               <ReceiptRow label="total Price" value={receipt.total_price} />
//             </ReceiptSection>

//             <ReceiptSection title="Trip Details">
//               <ReceiptRow label="Pickup Date" value={receipt.pickup_date} />
//               <ReceiptRow label="Return Date" value={receipt.return_date} />
//               <ReceiptRow label="Pickup Location" value={receipt.pickup_location} />
//               <ReceiptRow label="Dropoff Location" value={receipt.dropoff_location} />
//             </ReceiptSection>

//             <ReceiptSection title="Driver Details">
//               <ReceiptRow label="License No" value={receipt.driving_license_no} />
//               <ReceiptRow label="Date of Birth" value={receipt.date_of_birth} />
//               <ReceiptRow label="Nationality" value={receipt.nationality} />
//             </ReceiptSection>

//             <ReceiptSection title="Contact Info">
//               <ReceiptRow label="Passport No" value={receipt.passport_no} />
//               <ReceiptRow label="Email" value={receipt.email} />
//               <ReceiptRow label="GSM" value={receipt.gsm} />
//             </ReceiptSection>
//           </div>

//           {/* Actions */}
//           <button
//             onClick={downloadReceipt}
//             className='w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2'
//           >
//             <span>⬇</span> Download PDF Receipt
//           </button>

//           <button
//             onClick={resetForm}
//             className='w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition'
//           >
//             Make Another Booking
//           </button>
//         </div>
//       )}
//     </div>
//   )
// }

// /* ================= RECEIPT HELPERS ================= */
// const ReceiptSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
//   <div>
//     <div className='bg-gray-50 px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide border-y'>
//       {title}
//     </div>
//     <div className='divide-y'>{children}</div>
//   </div>
// )

// const ReceiptRow = ({ label, value }: { label: string; value: string }) => (
//   <div className='flex justify-between px-4 py-2'>
//     <span className='text-gray-500'>{label}</span>
//     <span className='font-medium text-gray-800'>{value || '—'}</span>
//   </div>
// )

// /* ================= REUSABLE INPUT ================= */
// const Input = ({
//   label,
//   name,
//   value,
//   onChange,
//   type = 'text',
// }: any) => (
//   <div>
//     <label className='font-medium'>{label}</label>
//     <input
//       type={type}
//       name={name}
//       value={value}
//       onChange={onChange}
//       className='w-full border rounded-lg p-3 mt-1'
//     />
//   </div>
// )

// /* ================= BUTTON ================= */
// const Button = ({
//   onClick,
//   text,
//   secondary = false,
// }: any) => (
//   <button
//     onClick={onClick}
//     className={`py-3 px-4 rounded-lg font-semibold transition ${
//       secondary
//         ? 'bg-gray-200 text-black'
//         : 'bg-blue-600 text-white hover:bg-blue-700'
//     }`}
//   >
//     {text}
//   </button>
// )

// export default BookingForm