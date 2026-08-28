'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import apiService from '@/app/services/apiService'

const STEPS = ['Account', 'Business', 'Review']

const VendorRegister = () => {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    password2: '',
    business_name: '',
    business_email: '',
    phone_number: '',
    address: '',
    city: '',
    country: '',
    business_registration_no: '',
    bio: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const nextStep = () => setStep((p) => Math.min(p + 1, 2))
  const prevStep = () => setStep((p) => Math.max(p - 1, 0))

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      await apiService.postWithoutToken('/vendors/register/', JSON.stringify(form))
      router.push('/vendor/pending')
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12'>
      <div className='w-full max-w-xl'>

        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Become a Vendor</h1>
          <p className='text-gray-500 mt-2'>List your cars and earn with every rental</p>
        </div>

        {/* Step indicator */}
        <div className='flex items-center justify-center gap-2 mb-8'>
          {STEPS.map((label, i) => (
            <div key={i} className='flex items-center gap-2'>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${i === step ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8'>

          {/* Step 0 — Account */}
          {step === 0 && (
            <div className='space-y-4'>
              <h2 className='text-lg font-semibold text-gray-800 mb-4'>Account Details</h2>
              <Field label='Full Name' name='full_name' value={form.full_name} onChange={handleChange} />
              <Field label='Email' name='email' type='email' value={form.email} onChange={handleChange} />
              <Field label='Password' name='password' type='password' value={form.password} onChange={handleChange} />
              <Field label='Confirm Password' name='password2' type='password' value={form.password2} onChange={handleChange} />
            </div>
          )}

          {/* Step 1 — Business */}
          {step === 1 && (
            <div className='space-y-4'>
              <h2 className='text-lg font-semibold text-gray-800 mb-4'>Business Details</h2>
              <Field label='Business Name' name='business_name' value={form.business_name} onChange={handleChange} />
              <Field label='Business Email' name='business_email' type='email' value={form.business_email} onChange={handleChange} />
              <Field label='Phone Number' name='phone_number' value={form.phone_number} onChange={handleChange} />
              <Field label='Address' name='address' value={form.address} onChange={handleChange} />
              <div className='grid grid-cols-2 gap-4'>
                <Field label='City' name='city' value={form.city} onChange={handleChange} />
                <Field label='Country' name='country' value={form.country} onChange={handleChange} />
              </div>
              <Field label='Business Registration No (optional)' name='business_registration_no' value={form.business_registration_no} onChange={handleChange} />
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Bio (optional)</label>
                <textarea
                  name='bio'
                  value={form.bio}
                  onChange={handleChange}
                  rows={3}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  placeholder='Tell us about your business...'
                />
              </div>
            </div>
          )}

          {/* Step 2 — Review */}
          {step === 2 && (
            <div className='space-y-4'>
              <h2 className='text-lg font-semibold text-gray-800 mb-4'>Review & Submit</h2>

              <ReviewSection title='Account'>
                <ReviewRow label='Name' value={form.full_name} />
                <ReviewRow label='Email' value={form.email} />
              </ReviewSection>

              <ReviewSection title='Business'>
                <ReviewRow label='Business Name' value={form.business_name} />
                <ReviewRow label='Business Email' value={form.business_email} />
                <ReviewRow label='Phone' value={form.phone_number} />
                <ReviewRow label='Location' value={`${form.city}, ${form.country}`} />
              </ReviewSection>

              <div className='bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700'>
                <p className='font-semibold mb-1'>What happens next?</p>
                <p>Your application will be reviewed by our admin team. You'll be notified once approved and can start listing your cars immediately.</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className='mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600'>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className='flex justify-between mt-8'>
            {step > 0 ? (
              <button onClick={prevStep} className='px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition'>
                Back
              </button>
            ) : <div />}

            {step < 2 ? (
              <button onClick={nextStep} className='px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition'>
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className='px-6 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60'
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>

        <p className='text-center text-sm text-gray-500 mt-6'>
          Already a vendor?{' '}
          <a href='/vendor/dashboard' className='text-blue-600 hover:underline'>Sign in</a>
        </p>
      </div>
    </div>
  )
}

const Field = ({ label, name, value, onChange, type = 'text' }: any) => (
  <div>
    <label className='block text-sm font-medium text-gray-700 mb-1'>{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
    />
  </div>
)

const ReviewSection = ({ title, children }: any) => (
  <div className='border border-gray-100 rounded-xl overflow-hidden'>
    <div className='bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide'>
      {title}
    </div>
    <div className='divide-y divide-gray-50'>{children}</div>
  </div>
)

const ReviewRow = ({ label, value }: any) => (
  <div className='flex justify-between px-4 py-2.5 text-sm'>
    <span className='text-gray-500'>{label}</span>
    <span className='font-medium text-gray-800'>{value || '—'}</span>
  </div>
)

export default VendorRegister