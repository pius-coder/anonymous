import Image from "next/image";
import { cn } from "@/lib/utils";

export function HeroGeneratedImage({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[16/10] overflow-hidden border-2 border-border bg-card shadow-xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(110deg,transparent_0%,transparent_42%,rgba(255,255,255,0.48)_50%,transparent_58%,transparent_100%)] animate-scanline" />
      <Image
        src="/images/session-jeu-hero-generated.png"
        alt="Lobby de compétition en ligne avec timer serveur, cartes de sessions, sièges joueurs et écran mobile"
        width={1792}
        height={1024}
        priority
        sizes="(min-width: 1024px) 46vw, 100vw"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export function PhaseFlowImage({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[16/9] overflow-hidden border-2 border-border bg-card shadow-xl",
        className,
      )}
    >
      <Image
        src="/images/session-flow-generated.png"
        alt="Flux visuel de session: entrée lobby, round actif, validation serveur et résultats internes"
        width={1792}
        height={1024}
        sizes="(min-width: 1024px) 45vw, 100vw"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
