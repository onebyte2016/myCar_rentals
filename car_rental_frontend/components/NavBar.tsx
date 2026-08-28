'use client'

import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import CustomButton from './CustomButton'
import { useRouter, usePathname } from 'next/navigation'

const NavBar = () => {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // only runs on client, no hydration mismatch
    // re-checks on every route change so login/logout redirects update the buttons
    // without needing a full page reload
    setIsAuthenticated(document.cookie.includes('session_access_token='))
  }, [pathname])

  return (
    <header className='w-full absolute z-10'>
      <nav className='max-w-[1440px] mx-auto flex justify-between items-center sm:px-16 px-6 py-4'>
        <Link href='/' className='flex justify-center items-center'>
          <Image
            src='/logo.svg'
            alt='Car Pack logo'
            width={118}
            height={18}
            className='object-contain'
          />
        </Link>

        <div className='flex items-center gap-2'>
          {!isAuthenticated ? (
            <>
              <CustomButton
                title='Sign In'
                btnType='button'
                containerStyles='text-primary-blue rounded-full bg-white min-w-[110px]'
                handleClick={() => router.push('/sign-in')}
              />
              <CustomButton
                title='Sign Up'
                btnType='button'
                containerStyles='text-primary-blue rounded-full bg-white min-w-[110px]'
                handleClick={() => router.push('/sign-up')}
              />
            </>
          ) : (
            <div
              onClick={() => router.push('/profile')}
              className='w-11 h-11 rounded-full bg-white flex items-center justify-center cursor-pointer shadow-md hover:scale-105 transition text-xl'
            >
              👤
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}

export default NavBar


// 'use client'

// import Link from 'next/link'
// import React, { useEffect, useState } from 'react'
// import Image from 'next/image'
// import CustomButton from './CustomButton'
// import { useRouter } from 'next/navigation'
// import { User } from 'lucide-react'

// const NavBar = () => {
//   const router = useRouter()

//   const [isAuthenticated, setIsAuthenticated] = useState(false)

//   useEffect(() => {
//     const token = localStorage.getItem('access_token')

//     if (token) {
//       setIsAuthenticated(true)
//     }
//   }, [])

//   return (
//     <header className='w-full absolute z-10'>
//       <nav
//         className='max-w-[1440px] mx-auto flex justify-between
//         items-center sm:px-16 px-6 py-4'
//       >
//         <Link
//           href='/'
//           className='flex justify-center items-center'
//         >
//           <Image
//             src='/logo.svg'
//             alt='Car Pack logo'
//             width={118}
//             height={18}
//             className='object-contain'
//           />
//         </Link>

//         {/* RIGHT SECTION */}
//         <div className='flex items-center gap-2'>
//           {!isAuthenticated ? (
//             <>
//               <CustomButton
//                 title='Sign In'
//                 btnType='button'
//                 containerStyles='text-primary-blue rounded-full bg-white min-w-[110px]'
//                 handleClick={() => router.push('/sign-in')}
//               />

//               <CustomButton
//                 title='Sign Up'
//                 btnType='button'
//                 containerStyles='text-primary-blue rounded-full bg-white min-w-[110px]'
//                 handleClick={() => router.push('/sign-up')}
//               />
//             </>
//           ) : (
//             <div
//               onClick={() => router.push('/profile')}
//               className='w-11 h-11 rounded-full bg-white flex items-center justify-center cursor-pointer shadow-md hover:scale-105 transition'
//             >
//               <User className='text-primary-blue' size={22} />
//             </div>
//           )}
//         </div>
//       </nav>
//     </header>
//   )
// }

// export default NavBar


// 'use client'
// import Link from 'next/link'
// import React from 'react'
// import Image from 'next/image'
// import CustomButton from './CustomButton'
// import { useRouter } from 'next/navigation'

// const NavBar = () => {
//   const router = useRouter();
//   return (
//     <header className='w-full absolute z-10'>
//         <nav className='max-w-[1440px] max-auto flex justify-between
//         items-center sm:px-16 px-6 py-4'>
//             <Link href="/" className='flex 
//             justify-center items-center'>
//                 <Image
//                 src="/logo.svg"
//                 // src="/abeliza-logo.jpeg"
//                 alt="Car Pack logo"
//                 width={118}
//                 height={18}
//                 className="object-contain"/>
//             </Link>

//             <CustomButton
//               title="Sign In"
//               btnType="button"
//               containerStyles='text-primary-blue rounded-full bg-white min-w-[130px]'
//               handleClick={() => router.push("/sign-in")}
//           />
//             <CustomButton
//               title="Sign up"
//               btnType="button"
//               containerStyles='text-primary-blue rounded-full bg-white min-w-[130px]'
//               handleClick={() => router.push("/sign-Up")}
//           />
//         </nav>
//     </header>
//   )
// }

// export default NavBar