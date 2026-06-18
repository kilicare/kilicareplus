'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import { Mail, Lock, Home, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { KiliInput } from '@/components/ui/KiliInput'
import { KiliButton } from '@/components/ui/KiliButton'
import { parseApiError } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const { setUser, setAuthenticated } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showHomeBtn, setShowHomeBtn] = useState(false)

  const loginMut = useMutation({
    mutationFn: () => authService.login(email, password),
    onSuccess: (data) => {
      setUser(data.user)
      setAuthenticated(true)
      toast.success(
        `Karibu ${data.user.first_name || data.user.username}! 🌍`
      )
      router.push('/feed')
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email || !password) {
      toast.error('Weka email na password')
      return
    }
    loginMut.mutate()
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 relative">
      {/* Home Button - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        {showHomeBtn ? (
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all"
          >
            <Home size={18} />
            <span className="text-sm font-medium">Home</span>
          </Link>
        ) : (
          <button
            onClick={() => setShowHomeBtn(true)}
            className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all flex items-center justify-center"
          >
            <Home size={18} />
          </button>
        )}
      </div>
      {/* Logo */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl font-black text-black mx-auto mb-4"
          style={{
            background: 'var(--gradient-gold)',
            boxShadow: 'var(--shadow-gold-lg)',
          }}
          animate={{
            boxShadow: [
              '0 0 30px rgba(245,166,35,0.4)',
              '0 0 50px rgba(245,166,35,0.65)',
              '0 0 30px rgba(245,166,35,0.4)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <img
            src="/icon-192.png"
            alt="Kilicare+"
            className="w-full h-full rounded-3xl object-cover"
          />
        </motion.div>
        <h1 className="text-3xl font-black text-text-primary">
          Kilicare+
        </h1>
        <p className="text-text-muted mt-1 text-sm">
          Tanzania Tourism Super-App 🌍
        </p>
      </motion.div>

      {/* Form - Glassmorphism Card */}
      <motion.form
        className="w-full max-w-sm space-y-4 bg-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={submit}
      >
        <KiliInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jina@email.com"
          icon={<Mail size={16} />}
          autoComplete="email"
          inputMode="email"
          className="!bg-black/30 border-white/5"
        />

        <KiliInput
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password yako"
          icon={<Lock size={16} />}
          showPasswordToggle
          autoComplete="current-password"
          className="!bg-black/30 border-white/5"
        />

        <div className="text-right">
          <Link
            href="/reset-password"
            className="text-xs text-gold hover:underline"
          >
            Umesahau password?
          </Link>
        </div>

        <KiliButton
          fullWidth size="lg"
          loading={loginMut.isPending}
          onClick={submit}
        >
          Ingia / Login
        </KiliButton>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border-subtle" />
          <span className="text-xs text-text-muted">au</span>
          <div className="flex-1 h-px bg-border-subtle" />
        </div>

        <p className="text-center text-sm text-text-muted">
          Huna akaunti?{' '}
          <Link
            href="/register"
            className="text-gold font-semibold hover:underline"
          >
            Jisajili hapa →
          </Link>
        </p>
      </motion.form>
    </div>
  )
}