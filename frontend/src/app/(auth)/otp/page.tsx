'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { KiliButton } from '@/components/ui/KiliButton'
import { parseApiError } from '@/lib/utils'

function OTPContent() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const params = useSearchParams()
  const email = params.get('email') || ''
  const purpose = params.get('purpose') || 'EMAIL_VERIFY'

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const verifyMut = useMutation({
    mutationFn: () =>
      authService.verifyOtp(email, otp.join(''), purpose),
    onSuccess: (data) => {
      if (purpose === 'EMAIL_VERIFY') {
        // ✅ AUTO-LOGIN AFTER EMAIL VERIFICATION
        console.log('[OTP] Email verified. Auto-logging in...')
        
        // Store tokens and update auth state
        if (data.access && data.refresh && data.user) {
          setAuth(data.user, data.access, data.refresh)
          
          toast.success('Email imethibitishwa! Karibu! 🎉')
          console.log('[OTP] ✅ Redirecting to /feed')
          
          // Redirect to feed (already authenticated)
          router.push('/feed')
        } else {
          // Fallback: tokens not in response, redirect to login
          console.warn('[OTP] ⚠️  Tokens not in response, redirecting to login')
          toast.success('Email imethibitishwa! Ingia sasa 🎉')
          router.push('/login')
        }
      } else {
        // PASSWORD_RESET flow
        router.push(
          `/reset-password/new?email=${encodeURIComponent(email)}&code=${otp.join('')}`
        )
      }
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const resendMut = useMutation({
    mutationFn: () => authService.sendOtp(email, purpose),
    onSuccess: () => {
      toast.success('OTP mpya imetumwa!')
      setCountdown(60)
      setOtp(['', '', '', '', '', ''])
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const onChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return
    const next = [...otp]
    next[i] = v.slice(-1)
    setOtp(next)
    if (v && i < 5) refs.current[i + 1]?.focus()
  }

  const onKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0)
      refs.current[i - 1]?.focus()
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6)
    if (pasted) {
      setOtp(pasted.split('').concat(Array(6).fill('')).slice(0, 6))
      refs.current[5]?.focus()
    }
  }

  const done = otp.every((d) => d !== '')

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
      <motion.div
        className="w-full max-w-sm text-center bg-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-5xl mb-6">📧</div>
        <h1 className="text-2xl font-black text-text-primary mb-2">
          Angalia Email Yako
        </h1>
        <p className="text-text-muted text-sm mb-1">
          Tumekutumia OTP ya tarakimu 6
        </p>
        <p className="text-gold font-semibold text-sm mb-8">{email}</p>

        <div className="flex gap-3 justify-center mb-8" onPaste={onPaste}>
          {otp.map((digit, i) => (
            <motion.input
              key={i}
              ref={(el) => { refs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-bold rounded-2xl outline-none transition-all"
              style={{
                background: digit
                  ? 'rgba(245,166,35,0.12)'
                  : 'rgba(26,26,36,0.9)',
                border: digit
                  ? '2px solid rgba(245,166,35,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
                color: digit ? '#F5A623' : '#F0F0F5',
              }}
              animate={digit ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.15 }}
            />
          ))}
        </div>

        <KiliButton
          fullWidth size="lg"
          loading={verifyMut.isPending}
          disabled={!done}
          onClick={() => verifyMut.mutate()}
        >
          Thibitisha OTP
        </KiliButton>

        <div className="mt-6">
          {countdown > 0 ? (
            <p className="text-text-muted text-sm">
              Resend kwa{' '}
              <span className="font-mono text-gold">{countdown}s</span>
            </p>
          ) : (
            <KiliButton
              variant="ghost"
              onClick={() => resendMut.mutate()}
              loading={resendMut.isPending}
            >
              Tuma tena OTP
            </KiliButton>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function OTPPage() {
  return (
    <Suspense>
      <OTPContent />
    </Suspense>
  )
}