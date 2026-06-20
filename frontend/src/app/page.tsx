import { PageContainer } from "@/components/layout/PageContainer";
import {
  FinalCtaSection,
  HowItWorksSection,
  LandingHero,
  SafetySection,
  SuiNativeSection,
  TrainingLoopSection,
  WhySection,
} from "@/components/landing/LandingSections";
import { DEFAULT_HERO_PANDA_PORTRAIT } from "@/lib/landing/heroPandaPortraits";

export default function LandingPage() {
  return (
    <>
      <link
        rel="preload"
        as="image"
        href={DEFAULT_HERO_PANDA_PORTRAIT}
        type="image/webp"
      />
      <PageContainer variant="wide" className="pb-16 pt-2">
      <LandingHero />
      <WhySection />
      <HowItWorksSection />
      <TrainingLoopSection />
      <SafetySection />
      <SuiNativeSection />
      <FinalCtaSection />

      <footer className="border-t border-product-line/50 pt-8 text-center text-xs text-product-muted">
        <p>
          TradingPanda · Sui-native autonomous agent wallet · Sui Overflow 2026
        </p>
      </footer>
    </PageContainer>
    </>
  );
}
