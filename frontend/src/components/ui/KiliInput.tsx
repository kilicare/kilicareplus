'use client'
import { forwardRef, useState, InputHTMLAttributes } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  showPasswordToggle?: boolean
}

export const KiliInput = forwardRef<HTMLInputElement, Props>(
  (
    {
      label, error, hint, icon, iconRight,
      showPasswordToggle, type, className, ...props
    },
    ref
  ) => {
    const [showPass, setShowPass] = useState(false)
    const inputType = showPasswordToggle
      ? showPass ? 'text' : 'password'
      : type

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'w-full h-13 bg-bg-elevated',
              'border border-border-subtle rounded-2xl',
              'text-text-primary text-sm',
              'transition-all duration-150',
              'outline-none placeholder:text-text-muted',
              'focus:border-gold',
              'focus:shadow-[0_0_0_3px_rgba(245,166,35,0.12)]',
              icon ? 'pl-11' : 'pl-4',
              showPasswordToggle || iconRight ? 'pr-11' : 'pr-4',
              error &&
                'border-kili-red focus:border-kili-red focus:shadow-[0_0_0_3px_rgba(255,45,45,0.12)]',
              className
            )}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {iconRight && !showPasswordToggle && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {iconRight}
            </div>
          )}
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-kili-red">
            <AlertCircle size={12} />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-text-muted">{hint}</p>
        )}
      </div>
    )
  }
)

KiliInput.displayName = 'KiliInput'