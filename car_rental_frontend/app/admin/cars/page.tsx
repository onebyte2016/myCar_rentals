'use client'
import { useEffect, useState } from 'react'
import apiService from '@/app/services/apiService'
// import router from 'next/router'
import { useRouter } from 'next/navigation'

export default function AdminCarsPage() {
  const [cars, setCars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    apiService.get('/cars/')
      .then((data) => setCars(Array.isArray(data) ? data : data?.results ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className='mt-3'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold text-navy-700 dark:text-white'>Cars</h1>
           <button
              onClick={() => router.push('/vendor/cars/add')}
              className='bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition'
            >
              + Add Car
            </button>
        <span className='text-sm text-gray-500'>{cars.length} total</span>
      </div>

      {loading ? (
        <p className='text-gray-400'>Loading...</p>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
          {cars.map((car: any) => (
            <div key={car.id} className='bg-white dark:bg-navy-800 rounded-2xl border border-gray-100 dark:border-navy-700 overflow-hidden shadow-sm'>
              {car.imageurl && (
                <img src={car.imageurl} alt={car.name} className='w-full h-44 object-cover' />
              )} 
              <div className='p-4'>
                <p className='font-bold text-navy-700 dark:text-white'>{car.name}</p>
                <p className='text-sm text-gray-400 mt-0.5'>{car.make} {car.model} · {car.year}</p>
                <div className='flex justify-between items-center mt-3'>
                  <span className='text-blue-600 font-bold'>OMR {car.price_per_day}/day</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    car.status === 'available' ? 'bg-green-100 text-green-700' :
                    car.status === 'rented' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {car.status}
                  </span>
                </div>
                <p className='text-xs text-gray-400 mt-2'>Plate: {car.plate_number}</p>
              </div>
            </div>
          ))}
          {!cars.length && (
            <div className='col-span-3 text-center py-12 text-gray-400'>No cars found</div>
          )}
        </div>
      )}
    </div>
  )
}