'use client'
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
import { useEffect } from 'react'

export default function LandingPage() {
  useEffect(() => {
    document.title = "Kilicare+ — Tanzania Real-World Experience Network"
  }, [])

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