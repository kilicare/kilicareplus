'use client'
import { motion } from 'framer-motion'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { KiliButton } from './KiliButton'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  code?: number
}

export function ErrorState({
  title = 'Hitilafu Imetokea',
  message = 'Kitu kimekwenda vibaya. Tafadhali jaribu tena.',
  onRetry,
  code,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <motion.div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(255,119,0,0.12)', border: '1px solid rgba(255,119,0,0.25)' }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <AlertTriangle size={28} className="text-kili-orange" />
      </motion.div>

      {code && (
        <p className="text-xs font-mono text-text-muted mb-1">
          Error {code}
        </p>
      )}

      <h3 className="text-lg font-black text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-muted mb-6 max-w-xs">{message}</p>

      {onRetry && (
        <KiliButton
          size="sm"
          variant="ghost"
          onClick={onRetry}
          icon={<RefreshCw size={14} />}
        >
          Jaribu Tena
        </KiliButton>
      )}
    </div>
  )
}

// ── Error Boundary ────────────────────────────────────────
import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ fallback?: React.ReactNode }>) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <ErrorState
          title="Hitilafu Imetokea"
          message={this.state.error?.message || 'Jaribu upya upya ukurasa'}
          onRetry={() => {
            this.setState({ hasError: false, error: null })
            window.location.reload()
          }}
        />
      )
    }
    return this.props.children
  }
}