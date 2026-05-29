'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { KiliInput } from '@/components/ui/KiliInput'
import { KiliButton } from '@/components/ui/KiliButton'
import { parseApiError } from '@/lib/utils'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  const mut = useMutation({
    mutationFn: () => authService.resetPassword(email),
    onSuccess: () => {
      toast.success('OTP imetumwa kwa email yako!')
      router.push(
        `/otp?email=${encodeURIComponent(email)}&purpose=PASSWORD_RESET`
      )
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
      <motion.div
        className="w-full max-w-sm bg-white/2 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-4xl text-center mb-6">🔐</div>
        <h1 className="text-2xl font-black text-text-primary text-center mb-2">
          Badilisha Password
        </h1>
        <p className="text-text-muted text-sm text-center mb-8">
          Weka email yako — tutakutumia OTP ya reset
        </p>

        <div className="space-y-4">
          <KiliInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jina@email.com"
            icon={<Mail size={16} />}
            inputMode="email"
          />
          <KiliButton
            fullWidth size="lg"
            loading={mut.isPending}
            disabled={!email.includes('@')}
            onClick={() => mut.mutate()}
          >
            Tuma OTP
          </KiliButton>
          <p className="text-center text-sm text-text-muted">
            <Link href="/login" className="text-gold hover:underline">
              ← Rudi Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}