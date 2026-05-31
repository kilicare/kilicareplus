import { create } from 'zustand'

interface MoreGridStore {
  isOpen: boolean
  openMoreGrid: () => void
  closeMoreGrid: () => void
  toggleMoreGrid: () => void
}

/**
 * Global store for managing More Grid modal state
 * 
 * Usage in components:
 * const { isOpen, openMoreGrid, closeMoreGrid } = useMoreGridStore()
 * 
 * Usage in events:
 * const store = useMoreGridStore()
 * store.openMoreGrid() // Opens the grid
 */
export const useMoreGridStore = create<MoreGridStore>((set) => ({
  isOpen: false,
  
  openMoreGrid: () => set({ isOpen: true }),
  
  closeMoreGrid: () => set({ isOpen: false }),
  
  toggleMoreGrid: () => set((state) => ({ isOpen: !state.isOpen })),
}))
