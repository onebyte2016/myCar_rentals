import PaymentCheckout from '@/components/checkout/PaymentCheckout'
 
export default function AdminPaymentCheckoutPage() {
  return (
    <PaymentCheckout
      bookingId={1001}
      bookingAmount={50000}
      carName="Toyota Camry"
      pickupDate="2026-05-26"
      returnDate="2026-05-30"
    />
  )
}