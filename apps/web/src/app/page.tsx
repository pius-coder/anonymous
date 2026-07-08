import type { Metadata } from "next";
import { Separator } from "@/components/retroui/separator";
import { DesignPreviewSection } from "@/components/game/home/design-preview-section";
import { FeatureMarquee } from "@/components/game/home/feature-marquee";
import { LandingHero } from "@/components/game/home/landing-hero";
import { PlayerJourneySection } from "@/components/game/home/player-journey-section";

export const metadata: Metadata = {
  title: "Session Jeu - Compétitions Stratégiques en Ligne",
  description:
    "Rejoignez des sessions de compétitions stratégiques en temps réel. Testez votre adresse, votre réflexion et votre stratégie dans un cadre structuré et équitable.",
  openGraph: {
    title: "Session Jeu - Compétitions Stratégiques en Ligne",
    description: "Rejoignez des sessions de compétitions stratégiques en temps réel.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <>
      <LandingHero />
      <FeatureMarquee />
      <PlayerJourneySection />
      <Separator />
      <DesignPreviewSection />
    </>
  );
}
