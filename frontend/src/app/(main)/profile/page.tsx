import { MoreFeaturesButton } from '@/components/navigation/MoreFeaturesButton'

export default function ProfilePage() {
  return (
    <div className="min-h-dvh bg-bg-base px-4 pt-safe pb-safe">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          <div className="text-5xl mb-3">👤</div>
          <p className="text-lg font-bold text-text-primary">Profile</p>
          <p className="text-sm text-text-muted mt-1">Wiki 10</p>
        </div>

        <MoreFeaturesButton />
      </div>
    </div>
  )
}