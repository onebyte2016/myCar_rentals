// routes.tsx
import {
  MdDashboard,
  MdDirectionsCar,
  MdBookOnline,
  MdStore,
  MdGpsFixed,
  MdPeople,
  MdMoney,
  MdPayment,
  MdOutlineBarChart,
  MdSettings,
  MdAccountBalanceWallet,
} from 'react-icons/md'


export const routes = [
  {
    name: 'Dashboard',
    layout: '/admin',
    path: 'default',
    icon: <MdDashboard className='h-6 w-6' />,
  },
  {
    name: 'Bookings',
    layout: '/admin',
    path: 'bookings',
    icon: <MdBookOnline className='h-6 w-6' />,
  },
  {
    name: 'Cars',
    layout: '/admin',
    path: 'cars',
    icon: <MdDirectionsCar className='h-6 w-6' />,
  },
  {
    name: 'Vendors',
    layout: '/admin',
    path: 'vendors',
    icon: <MdStore className='h-6 w-6' />,
  },
  {
    name: 'checkout',
    layout: '/admin',
    path: 'checkout',
    icon: <MdMoney className='h-6 w-6' />,
  },
  {
  name: 'Payments',
  layout: '/admin',
  path: 'payments',
  icon: <MdPayment className='h-6 w-6' />,
},
  {
    name: 'GPS Tracking',
    layout: '/admin',
    path: 'tracking',
    icon: <MdGpsFixed className='h-6 w-6' />,
  },
  {
    name: 'Users',
    layout: '/admin',
    path: 'users',
    icon: <MdPeople className='h-6 w-6' />,
  },
  {
    name: 'Reports',
    layout: '/admin',
    path: 'reports',
    icon: <MdOutlineBarChart className='h-6 w-6' />,
  },
  {
    name: 'Settings',
    layout: '/admin',
    path: 'profile',
    icon: <MdSettings className='h-6 w-6' />,
  },



// Add this to your routes array
{
  name: 'Wallet',
  layout: '/admin',
  path: 'wallet',
  icon: <MdAccountBalanceWallet className='h-6 w-6' />,
},
]