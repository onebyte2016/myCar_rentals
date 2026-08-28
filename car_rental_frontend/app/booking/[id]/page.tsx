import BookingForm from '@/components/BookingForm'

const BookingPage = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {

  const { id } = await params

  return (
    <div className='max-w-3xl mx-auto py-10 px-4'>
      <BookingForm carId={Number(id)} />
    </div>
  )
}

export default BookingPage