import { create } from 'zustand'

interface UIStore {
  activeSheet: string | null
  isOffline: boolean
  notificationCount: number
  chatCount: number
  openSheet: (id: string) => void
  closeSheet: () => void
  setOffline: (v: boolean) => void
  setNotificationCount: (n: number) => void
  setChatCount: (n: number) => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeSheet: null,
  isOffline: false,
  notificationCount: 0,
  chatCount: 0,
  openSheet: (id) => set({ activeSheet: id }),
  closeSheet: () => set({ activeSheet: null }),
  setOffline: (v) => set({ isOffline: v }),
  setNotificationCount: (n) => set({ notificationCount: n }),
  setChatCount: (n) => set({ chatCount: n }),
}))