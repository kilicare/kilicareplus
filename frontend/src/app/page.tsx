import type { Metadata } from 'next'
import { LandingNav }          from '@/components/landing/LandingNav'
import { HeroSection }         from '@/components/landing/HeroSection'
import { StatsSection }        from '@/components/landing/StatsSection'
import { FeaturesSection }     from '@/components/landing/FeaturesSection'
import { HowItWorksSection }   from '@/components/landing/HowItWorksSection'
import { TestimonialsSection }  from '@/components/landing/TestimonialsSection'
import { KilicareBetPreview }  from '@/components/landing/KilicareBetPreview'
import { PricingSection }      from '@/components/landing/PricingSection'
import { DownloadSection }     from '@/components/landing/DownloadSection'
import { FooterSection }       from '@/components/landing/FooterSection'

export const metadata: Metadata = {
  title: "KilicareGO+ — Tanzania's First Tourism Super-App",
  description:
    'Connect with 350+ verified local guides across Tanzania. Explore Serengeti, Kilimanjaro, Zanzibar with AI-powered experiences, real-time SOS safety, and community moments.',
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: '#050508' }}>
      <LandingNav />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <KilicareBetPreview />
      <PricingSection />
      <DownloadSection />
      <FooterSection />
    </main>
  )
}