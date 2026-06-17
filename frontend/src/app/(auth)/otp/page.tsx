'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, ChevronLeft } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { tokenManager } from '@/core/auth/TokenManager'
import { KiliButton } from '@/components/ui/KiliButton'
import { parseApiError } from '@/lib/utils'

function OTPContent() {
  const router = useRouter()
  const { setUser, setAuthenticated } = useAuthStore()
  const params = useSearchParams()
  const email = params.get('email') || ''
  const purpose = params.get('purpose') || 'EMAIL_VERIFY'

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const [countdown, setCountdown] = useState(60)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Auto-focus first input on mount
  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  const verifyMut = useMutation({
    mutationFn: () =>
      authService.verifyOtp(email, otp.join(''), purpose),
    onSuccess: (data) => {
      // Show success animation
      setShowSuccess(true)

      // Wait for animation then proceed
      setTimeout(() => {
        if (purpose === 'EMAIL_VERIFY') {
          // ✅ AUTO-LOGIN AFTER EMAIL VERIFICATION
          console.log('[OTP] Email verified. Auto-logging in...')
          
          // Store tokens and update auth state
          if (data.access && data.refresh && data.user) {
            tokenManager.setTokens(data.access, data.refresh)
            setUser(data.user)
            setAuthenticated(true)
            
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
      }, 1000)
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const resendMut = useMutation({
    mutationFn: () => authService.sendOtp(email, purpose),
    onSuccess: () => {
      toast.success('OTP mpya imetumwa!')
      setCountdown(60)
      setOtp(['', '', '', '', '', ''])
      refs.current[0]?.focus()
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

  // Container animations
  const containerVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
    exit: {
      opacity: 0,
      y: -40,
      transition: { duration: 0.3 },
    },
  }

  // OTP input animations
  const inputContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  }

  const inputVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        stiffness: 200,
        damping: 20,
      },
    },
  }

  // Success animation
  const successVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        stiffness: 200,
        damping: 20,
      },
    },
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-5 py-10">
      <AnimatePresence mode="wait">
        {!showSuccess ? (
          <motion.div
            key="form"
            className="w-full max-w-md"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Premium Glass Card */}
            <div className="relative overflow-hidden rounded-3xl">
              {/* Gradient background blur effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-kili-purple/5 opacity-30" />
              
              {/* Main card */}
              <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] border border-white/10 shadow-2xl shadow-black/20 rounded-3xl p-8 sm:p-10">
                {/* Header */}
                <motion.div
                  className="text-center mb-10"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  {/* Icon with glow */}
                  <motion.div
                    className="relative mb-6 flex justify-center"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full scale-150" />
                    <div className="relative text-6xl drop-shadow-lg">🔐</div>
                  </motion.div>

                  <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-text-primary via-gold to-text-primary bg-clip-text text-transparent mb-3">
                    Thibitisha OTP
                  </h1>
                  <p className="text-text-secondary text-sm sm:text-base leading-relaxed mb-2">
                    Tumekutumia code ya kulinganisha kwa email yako
                  </p>
                  <div className="inline-block px-4 py-2 bg-gold/10 border border-gold/30 rounded-full">
                    <p className="text-gold font-semibold text-sm break-all">
                      {email}
                    </p>
                  </div>
                </motion.div>

                {/* OTP Input Grid */}
                <motion.div
                  className="mb-10 px-2 sm:px-0"
                  variants={inputContainerVariants}
                  initial="hidden"
                  animate="visible"
                  onPaste={onPaste}
                >
                  <div className="flex gap-1.5 sm:gap-2.5 justify-center flex-wrap">
                    {otp.map((digit, i) => (
                      <motion.div
                        key={i}
                        variants={inputVariants}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <input
                          ref={(el) => {
                            refs.current[i] = el
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => onChange(i, e.target.value)}
                          onKeyDown={(e) => onKeyDown(i, e)}
                          className="w-12 h-14 sm:w-16 sm:h-20 text-center text-xl sm:text-3xl font-black outline-none transition-all duration-300"
                          style={{
                            background: digit
                              ? 'linear-gradient(135deg, rgba(245,166,35,0.15) 0%, rgba(245,166,35,0.08) 100%)'
                              : 'rgba(26,26,36,0.4)',
                            border: digit
                              ? '2px solid rgba(245,166,35,0.6)'
                              : '2px solid rgba(255,255,255,0.1)',
                            color: digit ? '#F5A623' : '#8B8BA7',
                            boxShadow: digit
                              ? '0 8px 32px rgba(245,166,35,0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
                              : '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(10px)',
                          }}
                          disabled={verifyMut.isPending}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="mb-8"
                >
                  <KiliButton
                    fullWidth
                    size="lg"
                    loading={verifyMut.isPending}
                    disabled={!done || verifyMut.isPending}
                    onClick={() => verifyMut.mutate()}
                    className="group relative overflow-hidden text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <span className="relative z-10">
                      {verifyMut.isPending ? 'Inathibitisha...' : 'Thibitisha Sasa'}
                    </span>
                  </KiliButton>
                </motion.div>

                {/* Resend Section */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="pt-8 border-t border-white/10"
                >
                  <div className="text-center">
                    {countdown > 0 ? (
                      <div className="space-y-3">
                        <p className="text-text-muted text-sm">
                          Sijashindwa OTP?
                        </p>
                        <p className="text-text-secondary font-semibold">
                          Tuma tena kwa{' '}
                          <span className="font-mono text-gold text-lg">
                            {countdown}s
                          </span>
                        </p>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <KiliButton
                          variant="ghost"
                          fullWidth
                          onClick={() => resendMut.mutate()}
                          loading={resendMut.isPending}
                          className="text-gold hover:text-gold-dim font-semibold"
                        >
                          📤 Tuma OTP Mpya
                        </KiliButton>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Back Button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="pt-4"
                >
                  <KiliButton
                    variant="ghost"
                    fullWidth
                    onClick={() => router.push('/login')}
                    className="text-text-muted hover:text-blue-500 font-semibold"
                  >
                    <ChevronLeft size={16} className="mr-2" />
                    Rudi Login
                  </KiliButton>
                </motion.div>

                {/* Security Info */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="mt-8 p-4 bg-gradient-to-r from-gold/5 to-kili-green/5 border border-gold/20 rounded-2xl"
                >
                  <p className="text-xs sm:text-sm text-text-muted text-center leading-relaxed">
                    🔒 Ujumbe huu ni salama. Code haitumwa kwa mahali pengine.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Success State */
          <motion.div
            key="success"
            className="w-full max-w-md"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-kili-green/5 via-transparent to-gold/5 opacity-30" />
              
              <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] border border-white/10 shadow-2xl shadow-black/20 rounded-3xl p-10 text-center">
                <motion.div
                  variants={successVariants}
                  initial="hidden"
                  animate="visible"
                  className="mb-6"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <CheckCircle2
                      size={80}
                      className="text-kili-green mx-auto drop-shadow-lg"
                      strokeWidth={1.5}
                    />
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <h2 className="text-2xl sm:text-3xl font-black text-kili-green mb-3">
                    Karibu!
                  </h2>
                  <p className="text-text-secondary text-sm sm:text-base mb-2">
                    OTP imethibitishwa kwa mafaniko
                  </p>
                  <p className="text-text-muted text-xs sm:text-sm">
                    Inakuandaa mahali mengine...
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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