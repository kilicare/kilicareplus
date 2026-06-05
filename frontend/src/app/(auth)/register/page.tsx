'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import { User, Mail, Lock, Phone, ChevronLeft, ChevronRight } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { KiliInput } from '@/components/ui/KiliInput'
import { KiliButton } from '@/components/ui/KiliButton'
import { parseApiError } from '@/lib/utils'

type Role = 'TOURIST' | 'LOCAL_GUIDE'
type Step = 1 | 2

interface FormData {
  username: string
  email: string
  password: string
  password2: string
  phone: string
  role: Role
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>({
    username: '', email: '',
    password: '', password2: '', phone: '', role: 'TOURIST',
  })

  const set =
    (k: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }))

  const mut = useMutation({
    mutationFn: () =>
      authService.register({
        username: form.username,
        email: form.email,
        password: form.password,
        password2: form.password2,
        role: form.role,
        phone: form.phone || undefined,
      }),
    onSuccess: () => {
      toast.success('Akaunti imeundwa! Angalia email yako 📧')
      router.push(
        `/otp?email=${encodeURIComponent(form.email)}&purpose=EMAIL_VERIFY`
      )
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const step1ok = () => {
    if (!form.role) {
      toast.error('Chagua jukumu lako')
      return false
    }
    if (!form.email.includes('@')) {
      toast.error('Email si sahihi')
      return false
    }
    if (form.username.length < 3) {
      toast.error('Username lazima iwe herufi 3+')
      return false
    }
    return true
  }

  const step2ok = () => {
    if (form.password.length < 8) {
      toast.error('Password lazima iwe herufi 8+')
      return false
    }
    if (form.password !== form.password2) {
      toast.error('Passwords hazilingani')
      return false
    }
    return true
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-black mx-auto mb-3"
          style={{ background: 'var(--gradient-gold)' }}
        >
          <img
            src="/icon-192.png"
            alt="Kilicare+"
            className="w-full h-full rounded-2xl object-cover"
          />
        </div>
        <h1 className="text-2xl font-black text-text-primary">Jisajili</h1>
        <p className="text-text-muted text-sm mt-1">
          Unda akaunti yako ya Kilicare+
        </p>
      </motion.div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <motion.div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-[#F5A623] to-[#E8892A]"
              initial={{ opacity: 0.4, scale: 0.8 }}
              animate={{
                opacity: s <= step ? 1 : 0.4,
                scale: s <= step ? 1 : 0.8,
                backgroundColor: s <= step ? '#F5A623' : 'rgba(42,42,58,0.8)',
                color: s <= step ? '#000' : '#8B8BA7',
                boxShadow: s <= step
                  ? '0px 4px 12px rgba(245,166,35,0.3)'
                  : '0px 0px 0px rgba(245,166,35,0)',
              }}
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 18,
              }}
            >
              {s}
            </motion.div>
            {s < 2 && (
              <div
                className="w-8 h-0.5 rounded-full transition-all"
                style={{
                  background:
                    s < step ? 'var(--gold)' : 'rgba(42,42,58,0.8)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <p className="text-sm font-semibold text-text-secondary mb-4">
                Wewe ni nani?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    {
                      role: 'TOURIST' as Role,
                      emoji: '🧳',
                      label: 'Msafiri',
                      sub: 'Ninataka kugundua Tanzania',
                    },
                    {
                      role: 'LOCAL_GUIDE' as Role,
                      emoji: '⭐',
                      label: 'Local Guide',
                      sub: 'Mimi ni mzawa wa Tanzania',
                    },
                  ]
                ).map((opt) => (
                  <motion.button
                    key={opt.role}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      setForm((p) => ({ ...p, role: opt.role }))
                    }
                    className="p-4 rounded-2xl text-left transition-all border"
                    style={{
                      background:
                        form.role === opt.role
                          ? 'rgba(245,166,35,0.10)'
                          : 'rgba(26,26,36,0.8)',
                      borderColor:
                        form.role === opt.role
                          ? 'rgba(245,166,35,0.4)'
                          : 'rgba(255,255,255,0.07)',
                    }}
                  >
                    <span className="text-2xl block mb-2">{opt.emoji}</span>
                    <p
                      className="text-sm font-bold"
                      style={{
                        color:
                          form.role === opt.role ? '#F5A623' : '#C8C8D8',
                      }}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {opt.sub}
                    </p>
                  </motion.button>
                ))}
              </div>
              <KiliInput
                label="Email"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="jina@email.com"
                icon={<Mail size={16} />}
                inputMode="email"
              />
              <KiliInput
                label="Username"
                value={form.username}
                onChange={set('username')}
                placeholder="jumadoja"
                icon={
                  <span className="text-text-muted text-sm">@</span>
                }
                hint="Herufi, namba, na underscore tu"
              />
              <KiliInput
                label="Namba ya Simu (optional)"
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+255 7XX XXX XXX"
                icon={<Phone size={16} />}
                inputMode="tel"
              />
              <KiliButton
                fullWidth size="lg"
                onClick={() => step1ok() && setStep(2)}
                iconRight={<ChevronRight size={18} />}
              >
                Endelea
              </KiliButton>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <KiliInput
                label="Password"
                value={form.password}
                onChange={set('password')}
                placeholder="Herufi 8 au zaidi"
                icon={<Lock size={16} />}
                showPasswordToggle
                hint="Angalau herufi 8"
              />
              <KiliInput
                label="Thibitisha Password"
                value={form.password2}
                onChange={set('password2')}
                placeholder="Rudia password"
                icon={<Lock size={16} />}
                showPasswordToggle
                error={
                  form.password2 &&
                  form.password !== form.password2
                    ? 'Passwords hazilingani'
                    : undefined
                }
              />
              <div className="flex gap-3">
                <KiliButton
                  variant="ghost" size="lg"
                  onClick={() => setStep(1)}
                  icon={<ChevronLeft size={18} />}
                >
                  Rudi
                </KiliButton>
                <KiliButton
                  fullWidth size="lg"
                  loading={mut.isPending}
                  onClick={() => step2ok() && mut.mutate()}
                >
                  Unda Akaunti
                </KiliButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-sm text-text-muted mt-6">
          Una akaunti?{' '}
          <Link
            href="/login"
            className="text-gold font-semibold hover:underline"
          >
            Ingia hapa →
          </Link>
        </p>
      </div>
    </div>
  )
}