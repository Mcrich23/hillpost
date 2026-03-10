import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { FooterSection } from "@/components/landing/footer-section";

export default function Home() {
  return (
    <div className="relative">
      <HeroSection />
      <FeaturesSection />
      <FooterSection />
    </div>
  );
}
