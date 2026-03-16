import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { AboutSection } from "@/components/landing/about-section";
import { OpenSourceSection } from "@/components/landing/open-source-section";
import { FooterSection } from "@/components/landing/footer-section";

export default function Home() {
  return (
    <div className="relative">
      <HeroSection />
      <FeaturesSection />
      <AboutSection />
      <OpenSourceSection />
      <FooterSection />
    </div>
  );
}
