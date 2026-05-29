'use client'
import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import { Lock, Eye, EyeOff } from 'lucide-react'
import api from '@/core/api/axios'
import { KiliInput } from '@/components/ui/KiliInput'
import { KiliButton } from '@/components/ui/KiliButton'
import { parseApiError } from '@/lib/utils'

function ResetPasswordNewContent() {
  const router = useRouter()
  const params = useSearchParams()
  
  const email = params.get('email') || ''
  const code = params.get('code') || ''
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Validation
  const passwordValid = newPassword.length >= 8
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0
  const canSubmit = passwordValid && passwordsMatch

  const resetMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/reset-password/', {
        email,
        otp: code,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      })
      return data
    },
    onSuccess: (data) => {
      toast.success('Password imebadilishwa kwa mafanikio! ✅')
      router.push('/login')
    },
    onError: (error) => {
      toast.error(parseApiError(error) || 'Hitilafu katika kubadilisha password')
    },
  })

  if (!email || !code) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <motion.div
          className="w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-5xl mb-6">⚠️</div>
          <h1 className="text-xl font-black text-text-primary mb-2">
            Data Sio Sahihi
          </h1>
          <p className="text-text-muted text-sm mb-6">
            Email au OTP haipo. Jaribu tena kutoka mwanzo.
          </p>
          <Link href="/reset-password">
            <KiliButton fullWidth>← Rudi Reset Password</KiliButton>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
      <motion.div
        className="w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="text-4xl text-center mb-6">🔐</div>
        <h1 className="text-2xl font-black text-text-primary text-center mb-2">
          Weka Password Mpya
        </h1>
        <p className="text-text-muted text-sm text-center mb-2">
          Email: <span className="text-gold font-semibold">{email}</span>
        </p>
        <p className="text-text-muted text-xs text-center mb-8 px-4">
          OTP imethibitishwa ✓
        </p>

        {/* Form */}
        <div className="space-y-4">
          {/* New Password */}
          <div className="relative">
            <KiliInput
              label="Password Mpya"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Angalau herufi 8"
              icon={<Lock size={16} />}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-10 text-text-muted hover:text-text-primary transition"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {newPassword && !passwordValid && (
              <p className="text-xs text-red-500 mt-1">
                Password lazima iwe herufi 8+
              </p>
            )}
            {newPassword && passwordValid && (
              <p className="text-xs text-green-500 mt-1">✓ Password sahihi</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <KiliInput
              label="Thibitisha Password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Rudia password"
              icon={<Lock size={16} />}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-10 text-text-muted hover:text-text-primary transition"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">
                Passwords hazilingani
              </p>
            )}
            {confirmPassword && passwordsMatch && (
              <p className="text-xs text-green-500 mt-1">✓ Zinaendana</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-text-muted space-y-1">
            <p className={passwordValid ? 'text-green-500' : ''}>
              {passwordValid ? '✓' : '○'} Herufi 8+ 
            </p>
            <p className={passwordsMatch ? 'text-green-500' : ''}>
              {passwordsMatch ? '✓' : '○'} Passwords zinaendana
            </p>
          </div>

          {/* Submit Button */}
          <KiliButton
            fullWidth
            size="lg"
            loading={resetMut.isPending}
            disabled={!canSubmit || resetMut.isPending}
            onClick={() => resetMut.mutate()}
            className={!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {resetMut.isPending ? 'Inabadilisha...' : 'Badilisha Password'}
          </KiliButton>

          {/* Back Link */}
          <p className="text-center text-sm text-text-muted">
            <Link href="/login" className="text-gold hover:underline">
              ← Rudi Login
            </Link>
          </p>
        </div>

        {/* Status Messages */}
        {resetMut.isError && (
          <motion.div
            className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {parseApiError(resetMut.error) || 'Hitilafu katika kubadilisha password'}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default function ResetPasswordNewPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="text-white/50">Loading...</div></div>}>
      <ResetPasswordNewContent />
    </Suspense>
  )
}
