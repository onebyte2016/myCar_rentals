"use client";

import { CarProps } from '@/types'
import { generateCarImageUrl } from '@/utils';
import React, { useState } from 'react'
import Image from 'next/image';
import CustomButton from './CustomButton';
import CarDetails from './CarDetails';
import { useRouter } from 'next/navigation';


interface CarCardProps{
    car: CarProps
}
const CarCard = ({car}: CarCardProps) => {
    const {city_mpg, year, make, model, transmission, drive, price_per_day} = car;
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

  return (
    <div className='car-card group'>
        <div className='car-card__content'>
            <h2 className='car-card__content-title'>
                {make} {model}
            </h2>
        </div>
        <p className='flex mt-6 text-[32px] font-extrabold'>
            <span className='self-start text-[14px] font-semibold'>
                OMR{' '}
            </span>
            {Number(price_per_day).toFixed(2)}
            <span className='self-end text-[14px] font-medium'>
                /day
            </span>
        </p>
      <div className='relative w-full h-52 overflow-hidden rounded-xl bg-white-500'>
            {/* <Image
                src={car.imageurl}
                alt="car"
                fill
                className='object-cover'
            />
        </div>

        <div className='relative w-full h-40 my-3'> */}
            <img
                src={car.imageurl}
                alt="car"
                className='w-full h-full object-cover'
            />
        </div>

        {/* <div className='relative w-full h-52'>
        <Image
            src={car.imageurl}
            alt="car"
            fill
            className='object-cover rounded-xl'
        />
    </div> */}
        <div className='relative flex w-full mt-2'>
            <div className='flex group-hover:invisible w-full 
            justify-between text-gray'>
                <div className='flex flex-col justify-center items-center gap-2 text-red'>
                    <Image src="/steering-wheel.svg" width={20} 
                    height={20} alt='steering wheel'/>
                    <p className='text-[14px]'>
                        {transmission === "a" ? "Automatic" : "Manual"}
                    </p>

                </div>
                <div className='flex flex-col justify-center items-center gap-2 text-red'>
                    <Image src="/tire.svg" width={20} 
                    height={20} alt='tire'/>
                    <p className='text-[14px]'>
                       {drive.toUpperCase()}
                    </p>

                </div>
                <div className='flex flex-col justify-center items-center gap-2 text-red'>
                <Image 
                    src="/gas.svg" 
                    width={20} 
                    height={20} 
                    alt='gas'
                />

                <p className='text-[14px] text-red'>
                    {city_mpg} MPG
                </p>
            </div>
            </div>

            <div className='car-card__btn-container flex gap-3'>
            
            <CustomButton
                title='View More'
                containerStyles='flex-1 py-[16px] rounded-full bg-primary-blue'
                textStyles='text-white text-[14px] leading-[17px] font-bold'
                rightIcon='/right-arrow.svg'
                handleClick={() => setIsOpen(true)}
            />

            <CustomButton
                title='Rent Car'
                containerStyles='flex-1 py-[16px] rounded-full bg-green-600'
                textStyles='text-white text-[14px] leading-[17px] font-bold'
                handleClick={() => router.push(`/booking/${car.id}`)}
            />

            {/* <CustomButton
                title='Rent a Car'
                containerStyles='flex-1 py-[16px] rounded-full bg-green-600'
                textStyles='text-white text-[14px] leading-[17px] font-bold'
                handleClick={() => setIsOpen(true)}
            /> */}

        </div>
            {/* <div className='car-card__btn-container'>
                <CustomButton
                title='View More'
                containerStyles='w-full py-[16px] rounded-full bg-primary-blue'
                textStyles='text-white text-[14px] leading-[17px] font-bold'
                rightIcon='/right-arrow.svg'
                handleClick={() => setIsOpen(true)}
                />
            </div> */}
        </div>
        <CarDetails isOpen={isOpen} closeModal={() =>
            setIsOpen(false)} car={car}/>
    </div>
  )
}

export default CarCard