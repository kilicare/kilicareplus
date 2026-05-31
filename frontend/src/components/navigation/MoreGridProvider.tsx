'use client'

import { ReactNode } from 'react'
import { MoreGrid } from '@/components/navigation/MoreGrid'
import { useMoreGridStore } from '@/stores/moreGrid.store'

/**
 * Global provider for More Grid modal system
 * Mounted once in root layout
 */
export function MoreGridProvider({ children }: { children: ReactNode }) {
  const isOpen = useMoreGridStore((s) => s.isOpen)
  const closeMoreGrid = useMoreGridStore((s) => s.closeMoreGrid)

  return (
    <>
      {children}

      {/* Global More Grid Modal */}
      <MoreGrid
        isOpen={isOpen}
        onClose={closeMoreGrid}
      />
    </>
  )
}