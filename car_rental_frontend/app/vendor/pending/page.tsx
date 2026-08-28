export default function VendorPendingPage() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 px-4'>
      <div className='text-center max-w-md'>
        <div className='text-6xl mb-4'>⏳</div>
        <h1 className='text-2xl font-bold text-gray-900 mb-2'>Application Submitted!</h1>
        <p className='text-gray-500 mb-6'>
          Your vendor application is under review. Our team will approve your account within 24–48 hours.
          You'll receive an email once approved.
        </p>
        <a
          href='/'
          className='inline-block bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition'
        >
          Back to Home
        </a>
      </div>
    </div>
  )
}
 