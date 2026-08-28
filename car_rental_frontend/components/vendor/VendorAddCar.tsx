'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import apiService from '@/app/services/apiService'

export default function VendorAddCar() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    make: '',
    model: '',
    year: '',
    plate_number: '',
    color: '',
    fuel_type: 'gasoline',
    transmission: 'a',
    drive: 'fwd',
    cylinders: '',
    displacement: '',
    city_mpg: '',
    highway_mpg: '',
    combination_mpg: '',
    price_per_day: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!form.name || !form.make || !form.model || !form.year || !form.plate_number || !form.price_per_day) {
      setError('Please fill in all required fields: Name, Make, Model, Year, Plate Number and Price.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '') formData.append(key, value)
      })
      if (imageFile) {
        formData.append('image', imageFile)
      }

      await apiService.post('/vendors/cars/', formData)
      router.push('/vendor/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Failed to add car. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50'>

      {/* Navbar */}
      <nav className='bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10'>
        <div className='max-w-3xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => router.back()}
              className='text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1'
            >
              ← Back
            </button>
            <span className='text-gray-300'>|</span>
            <h1 className='font-semibold text-gray-800'>Add New Car</h1>
          </div>
          <span className='text-sm text-gray-400'>Vendor Portal</span>
        </div>
      </nav>

      <div className='max-w-3xl mx-auto px-6 py-8'>
        <div className='bg-white rounded-2xl border border-gray-100 p-8'>

          {/* Image upload */}
          <div className='mb-8'>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Car Photo</label>
            <div
              className='border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:border-blue-400 transition'
              onClick={() => document.getElementById('car-image-input')?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt='Preview' className='w-full h-52 object-cover' />
              ) : (
                <div className='h-52 flex flex-col items-center justify-center text-gray-400'>
                  <span className='text-4xl mb-2'>📷</span>
                  <p className='text-sm'>Click to upload car photo</p>
                  <p className='text-xs mt-1'>JPG, PNG up to 10MB</p>
                </div>
              )}
            </div>
            <input
              id='car-image-input'
              type='file'
              accept='image/*'
              onChange={handleImageChange}
              className='hidden'
            />
            {imagePreview && (
              <button
                onClick={() => { setImageFile(null); setImagePreview(null) }}
                className='text-xs text-red-400 hover:text-red-600 mt-2'
              >
                Remove photo
              </button>
            )}
          </div>

          <div className='space-y-8'>

            {/* Basic Info */}
            <Section title='Basic Information'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Field label='Car Name *' name='name' value={form.name} onChange={handleChange} placeholder='e.g. 2022 Audi R8 Coupe' />
                <Field label='Make *' name='make' value={form.make} onChange={handleChange} placeholder='e.g. Audi' />
                <Field label='Model *' name='model' value={form.model} onChange={handleChange} placeholder='e.g. R8' />
                <Field label='Year *' name='year' value={form.year} onChange={handleChange} placeholder='e.g. 2022' type='number' />
                <Field label='Plate Number *' name='plate_number' value={form.plate_number} onChange={handleChange} placeholder='e.g. ABC-1234' />
                <Field label='Color' name='color' value={form.color} onChange={handleChange} placeholder='e.g. Matte Black' />
              </div>
            </Section>

            {/* Engine & Drivetrain */}
            <Section title='Engine & Drivetrain'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <SelectField
                  label='Fuel Type'
                  name='fuel_type'
                  value={form.fuel_type}
                  onChange={handleChange}
                  options={[
                    { value: 'gasoline', label: 'Gasoline' },
                    { value: 'diesel', label: 'Diesel' },
                    { value: 'electric', label: 'Electric' },
                    { value: 'hybrid', label: 'Hybrid' },
                  ]}
                />
                <SelectField
                  label='Transmission'
                  name='transmission'
                  value={form.transmission}
                  onChange={handleChange}
                  options={[
                    { value: 'a', label: 'Automatic' },
                    { value: 'm', label: 'Manual' },
                  ]}
                />
                <SelectField
                  label='Drive Type'
                  name='drive'
                  value={form.drive}
                  onChange={handleChange}
                  options={[
                    { value: 'fwd', label: 'Front-Wheel Drive (FWD)' },
                    { value: 'rwd', label: 'Rear-Wheel Drive (RWD)' },
                    { value: 'awd', label: 'All-Wheel Drive (AWD)' },
                    { value: '4wd', label: '4-Wheel Drive (4WD)' },
                  ]}
                />
                <Field label='Cylinders' name='cylinders' value={form.cylinders} onChange={handleChange} placeholder='e.g. 8' type='number' />
                <Field label='Displacement (L)' name='displacement' value={form.displacement} onChange={handleChange} placeholder='e.g. 5.2' />
              </div>
            </Section>

            {/* Fuel Economy */}
            <Section title='Fuel Economy (MPG)'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <Field label='City MPG' name='city_mpg' value={form.city_mpg} onChange={handleChange} placeholder='e.g. 15' type='number' />
                <Field label='Highway MPG' name='highway_mpg' value={form.highway_mpg} onChange={handleChange} placeholder='e.g. 22' type='number' />
                <Field label='Combined MPG' name='combination_mpg' value={form.combination_mpg} onChange={handleChange} placeholder='e.g. 18' type='number' />
              </div>
            </Section>

            {/* Pricing */}
            <Section title='Pricing'>
              <div className='max-w-xs'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Price Per Day (OMR) *</label>
                <div className='relative'>
                  <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium'>OMR</span>
                  <input
                    type='number'
                    name='price_per_day'
                    value={form.price_per_day}
                    onChange={handleChange}
                    placeholder='0.00'
                    min='0'
                    step='0.01'
                    className='w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
              </div>
            </Section>

          </div>

          {/* Error */}
          {error && (
            <div className='mt-6 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600'>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className='flex justify-between items-center mt-8 pt-6 border-t border-gray-100'>
            <button
              onClick={() => router.back()}
              className='px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition'
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className='px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 flex items-center gap-2'
            >
              {loading ? (
                <>
                  <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  Saving...
                </>
              ) : (
                'Add Car'
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className='text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100'>
      {title}
    </h3>
    {children}
  </div>
)

const Field = ({
  label, name, value, onChange, type = 'text', placeholder = ''
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  placeholder?: string
}) => (
  <div>
    <label className='block text-sm font-medium text-gray-700 mb-1'>{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
    />
  </div>
)

const SelectField = ({
  label, name, value, onChange, options
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: { value: string; label: string }[]
}) => (
  <div>
    <label className='block text-sm font-medium text-gray-700 mb-1'>{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
)





// 'use client'

// import { useState } from 'react'
// import { useRouter } from 'next/navigation'
// import apiService from '@/app/services/apiService'

// const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid']
// const TRANSMISSIONS = ['Automatic', 'Manual']
// const CAR_TYPES = ['Sedan', 'SUV', 'Coupe', 'Hatchback', 'Pickup', 'Van', 'Convertible', 'Wagon']

// export default function VendorAddCar() {
//   const router = useRouter()
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')
//   const [imageFile, setImageFile] = useState<File | null>(null)
//   const [imagePreview, setImagePreview] = useState<string | null>(null)

//   const [form, setForm] = useState({
//     name: '',
//     brand: '',
//     model: '',
//     year: '',
//     plate_number: '',
//     color: '',
//     car_type: 'Sedan',
//     fuel_type: 'Petrol',
//     transmission: 'Automatic',
//     seats: '5',
//     price_per_day: '',
//     description: '',
//   })

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
//   ) => {
//     setForm({ ...form, [e.target.name]: e.target.value })
//     setError('')
//   }

//   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (!file) return
//     setImageFile(file)
//     setImagePreview(URL.createObjectURL(file))
//   }

//   const handleSubmit = async () => {
//     // Basic validation
//     if (!form.name || !form.plate_number || !form.price_per_day) {
//       setError('Please fill in all required fields.')
//       return
//     }

//     setLoading(true)
//     setError('')

//     try {
//       const formData = new FormData()
//       Object.entries(form).forEach(([key, value]) => {
//         formData.append(key, value)
//       })
//       if (imageFile) {
//         formData.append('car_image', imageFile)
//       }

//       await apiService.post('/vendors/cars/', formData)
//       router.push('/vendor/dashboard')
//     } catch (err: any) {
//       setError(err?.message || 'Failed to add car. Please try again.')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className='min-h-screen bg-gray-50'>

//       {/* Navbar */}
//       <nav className='bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10'>
//         <div className='max-w-3xl mx-auto flex items-center justify-between'>
//           <div className='flex items-center gap-4'>
//             <button
//               onClick={() => router.back()}
//               className='text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1'
//             >
//               ← Back
//             </button>
//             <span className='text-gray-300'>|</span>
//             <h1 className='font-semibold text-gray-800'>Add New Car</h1>
//           </div>
//           <span className='text-sm text-gray-400'>Vendor Portal</span>
//         </div>
//       </nav>

//       <div className='max-w-3xl mx-auto px-6 py-8'>
//         <div className='bg-white rounded-2xl border border-gray-100 p-8'>

//           {/* Image upload */}
//           <div className='mb-8'>
//             <label className='block text-sm font-medium text-gray-700 mb-2'>Car Photo</label>
//             <div
//               className='border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:border-blue-400 transition'
//               onClick={() => document.getElementById('car-image-input')?.click()}
//             >
//               {imagePreview ? (
//                 <img src={imagePreview} alt='Preview' className='w-full h-48 object-cover' />
//               ) : (
//                 <div className='h-48 flex flex-col items-center justify-center text-gray-400'>
//                   <span className='text-4xl mb-2'>📷</span>
//                   <p className='text-sm'>Click to upload car photo</p>
//                   <p className='text-xs mt-1'>JPG, PNG up to 10MB</p>
//                 </div>
//               )}
//             </div>
//             <input
//               id='car-image-input'
//               type='file'
//               accept='image/*'
//               onChange={handleImageChange}
//               className='hidden'
//             />
//             {imagePreview && (
//               <button
//                 onClick={() => { setImageFile(null); setImagePreview(null) }}
//                 className='text-xs text-red-400 hover:text-red-600 mt-2'
//               >
//                 Remove photo
//               </button>
//             )}
//           </div>

//           {/* Form fields */}
//           <div className='space-y-6'>

//             {/* Basic info */}
//             <Section title='Basic Information'>
//               <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
//                 <Field label='Car Name *' name='name' value={form.name} onChange={handleChange} placeholder='e.g. 2022 Toyota Camry' />
//                 <Field label='Brand *' name='brand' value={form.brand} onChange={handleChange} placeholder='e.g. Toyota' />
//                 <Field label='Model' name='model' value={form.model} onChange={handleChange} placeholder='e.g. Camry' />
//                 <Field label='Year' name='year' value={form.year} onChange={handleChange} placeholder='e.g. 2022' type='number' />
//               </div>
//             </Section>

//             {/* Details */}
//             <Section title='Car Details'>
//               <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
//                 <Field label='Plate Number *' name='plate_number' value={form.plate_number} onChange={handleChange} placeholder='e.g. ABC-1234' />
//                 <Field label='Color' name='color' value={form.color} onChange={handleChange} placeholder='e.g. Black' />
//                 <SelectField label='Car Type' name='car_type' value={form.car_type} onChange={handleChange} options={CAR_TYPES} />
//                 <SelectField label='Fuel Type' name='fuel_type' value={form.fuel_type} onChange={handleChange} options={FUEL_TYPES} />
//                 <SelectField label='Transmission' name='transmission' value={form.transmission} onChange={handleChange} options={TRANSMISSIONS} />
//                 <Field label='Number of Seats' name='seats' value={form.seats} onChange={handleChange} type='number' placeholder='5' />
//               </div>
//             </Section>

//             {/* Pricing */}
//             <Section title='Pricing'>
//               <div className='max-w-xs'>
//                 <label className='block text-sm font-medium text-gray-700 mb-1'>
//                   Price Per Day (USD) *
//                 </label>
//                 <div className='relative'>
//                   <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium'>$</span>
//                   <input
//                     type='number'
//                     name='price_per_day'
//                     value={form.price_per_day}
//                     onChange={handleChange}
//                     placeholder='0.00'
//                     min='0'
//                     step='0.01'
//                     className='w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
//                   />
//                 </div>
//               </div>
//             </Section>

//             {/* Description */}
//             <Section title='Description'>
//               <div>
//                 <label className='block text-sm font-medium text-gray-700 mb-1'>
//                   Description (optional)
//                 </label>
//                 <textarea
//                   name='description'
//                   value={form.description}
//                   onChange={handleChange}
//                   rows={4}
//                   placeholder='Describe your car — features, condition, special notes...'
//                   className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'
//                 />
//               </div>
//             </Section>

//           </div>

//           {/* Error */}
//           {error && (
//             <div className='mt-6 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600'>
//               {error}
//             </div>
//           )}

//           {/* Actions */}
//           <div className='flex justify-between items-center mt-8 pt-6 border-t border-gray-100'>
//             <button
//               onClick={() => router.back()}
//               className='px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition'
//             >
//               Cancel
//             </button>
//             <button
//               onClick={handleSubmit}
//               disabled={loading}
//               className='px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 flex items-center gap-2'
//             >
//               {loading ? (
//                 <>
//                   <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
//                   Saving...
//                 </>
//               ) : (
//                 'Add Car'
//               )}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// /* ── Reusable components ── */
// const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
//   <div>
//     <h3 className='text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100'>
//       {title}
//     </h3>
//     {children}
//   </div>
// )

// const Field = ({
//   label, name, value, onChange, type = 'text', placeholder = ''
// }: {
//   label: string
//   name: string
//   value: string
//   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
//   type?: string
//   placeholder?: string
// }) => (
//   <div>
//     <label className='block text-sm font-medium text-gray-700 mb-1'>{label}</label>
//     <input
//       type={type}
//       name={name}
//       value={value}
//       onChange={onChange}
//       placeholder={placeholder}
//       className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
//     />
//   </div>
// )

// const SelectField = ({
//   label, name, value, onChange, options
// }: {
//   label: string
//   name: string
//   value: string
//   onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
//   options: string[]
// }) => (
//   <div>
//     <label className='block text-sm font-medium text-gray-700 mb-1'>{label}</label>
//     <select
//       name={name}
//       value={value}
//       onChange={onChange}
//       className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
//     >
//       {options.map((o) => (
//         <option key={o} value={o}>{o}</option>
//       ))}
//     </select>
//   </div>
// )