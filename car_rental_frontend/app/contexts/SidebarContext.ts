import { createContext, Dispatch, SetStateAction } from 'react';

interface SidebarContextType {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  sidebarWidth?: number;
}

export const SidebarContext = createContext<Partial<SidebarContextType>>({});
