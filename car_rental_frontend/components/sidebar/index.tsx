/* eslint-disable */

import { HiX } from 'react-icons/hi';
import Links from './components/Links';
import SidebarCard from '@/components/sidebar/components/SidebarCard';
import { IRoute } from '@/types/navigation';
import { useState } from 'react';



// function SidebarHorizon(props: { routes: IRoute[]; [x: string]: any }) {
//   const { routes, open, setOpen } = props;
//   const [collapsed, setCollapsed] = useState(false);

//   return (
//     <>
//       {/* Overlay (mobile) */}
//       {open && (
//         <div
//           onClick={() => setOpen(false)}
//           className="fixed inset-0 bg-black/40 md:hidden"
//         />
//       )}

//       <div
//         className={`fixed top-0 left-0 z-50 h-full bg-white dark:!bg-navy-800 shadow-2xl
//         transition-all duration-300 ease-in-out overflow-hidden
//         ${collapsed ? 'w-20' : 'w-64'}
//         ${open ? 'translate-x-0' : '-translate-x-full'}
//         md:translate-x-0`}
//       >
//         {/* Collapse button */}
//         <button
//           onClick={() => setCollapsed(!collapsed)}
//           className="hidden md:flex absolute right-2 top-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
//         >
//           {collapsed ? '➡️' : '⬅️'}
//         </button>

//         {/* Close mobile */}
//         <span
//           className="absolute right-4 top-4 block cursor-pointer xl:hidden"
//           onClick={() => setOpen(false)}
//         >
//           ✕
//         </span>

//         {/* Logo */}
//         <div className="flex items-center justify-center mt-12">
//           {!collapsed && (
//             <div className="text-xl font-bold text-navy-700 dark:text-white">
//               Abeliza Rental
//             </div>
//           )}
//         </div>

//         <div className="mt-6 border-t border-gray-200 dark:border-white/10" />

//         {/* Links */}
//         <div className="mt-6">
//           <Links routes={routes} collapsed={collapsed} />
//         </div>

//         {/* Bottom card */}
//         {!collapsed && (
//           <div className="absolute bottom-6 w-full flex justify-center">
//             <SidebarCard />
//           </div>
//         )}
//       </div>
//     </>
//   );
// }
// export default SidebarHorizon;

function SidebarHorizon(props: { routes: IRoute[]; [x: string]: any }) {
  const { routes, open, setOpen } = props;
  return (
    <div
        className={`sm:none w-67 duration-175 linear fixed !z-50 flex min-h-full flex-col bg-white pb-10 shadow-2xl shadow-white/5 transition-all dark:!bg-navy-800 dark:text-white md:!z-50 lg:!z-50 xl:!z-0 ${
          open ? 'translate-x-0' : '-translate-x-67 xl:translate-x-0'
        }`}>

      {/* <div className={`sm:none duration-175 linear fixed !z-50 flex min-h-full flex-col bg-white pb-10 shadow-2xl shadow-white/5 transition-all dark:!bg-navy-800 dark:text-white md:!z-50 lg:!z-50 xl:!z-0 ${
        open ? 'translate-x-0' : '-translate-x-96 xl:translate-x-0'
      }`} >   */}

      <span
        className="absolute right-4 top-4 block cursor-pointer xl:hidden"
        onClick={() => setOpen(false)}
      >
        <HiX />
      </span>

      <div className={`mx-[56px] mt-[50px] flex items-center`}>
        <div className="ml-1 mt-1 h-2.5 font-poppins text-[26px] font-bold uppercase text-navy-700 dark:text-white">
          Abeliza <span className="font-medium">Rental</span>
        </div>
      </div>
      <div className="mb-7 mt-[58px] h-px bg-gray-300 dark:bg-white/30" />
      {/* Nav item */}

      <ul className="mb-auto pt-1">
        <Links routes={routes} />
      </ul>

      {/* Free Horizon Card */}
      <div className="flex justify-center">
        <SidebarCard />
      </div>

      {/* Nav item end */}
    </div>
  );
}

export default SidebarHorizon;
