// app/admin/layout.tsx
'use client'

import { routes } from '@/routes'
import Sidebar from '@/components/sidebar'
import Footer from '@/components/footer/Footer'
import { SidebarContext } from '../contexts/SidebarContext'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/navbar/index'
import { useIsAdmin } from '../lib/useAuth'

// Nav entries that should only be visible to admin (is_staff) accounts.
const ADMIN_ONLY_PATHS = ['users']

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  const pathname = usePathname()
  const { isAdmin } = useIsAdmin()

  const currentRoute = routes.find((r) => pathname?.includes(r.path))
  const pageName = currentRoute?.name ?? 'Dashboard'

  const visibleRoutes = routes.filter((r) => isAdmin || !ADMIN_ONLY_PATHS.includes(r.path))

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div className='flex h-full w-full bg-lightPrimary dark:!bg-navy-900'>
        <Sidebar routes={visibleRoutes} />
        <div className='h-full w-full bg-lightPrimary dark:!bg-navy-900'>
          <main className={`mx-[12px] h-full flex-none transition-all md:pr-2 ${
            open ? 'xl:ml-[313px]' : 'xl:ml-[0px]'
          }`}>
            <div className='h-full'>
              <Navbar
                onOpenSidenav={() => setOpen(!open)}
                logoText='Abeliza Admin'
                brandText={pageName}
                secondary={false}
              />
              <div className='mx-auto mb-auto h-full min-h-[84vh] p-2 md:pr-2'>
                {children}
              </div>
              <div className='p-3'>
                <Footer />
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}