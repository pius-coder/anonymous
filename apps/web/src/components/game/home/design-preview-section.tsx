import { Badge } from "@/components/retroui/badge";
import { PhaseFlowImage } from "@/components/game/generated-art";

export function DesignPreviewSection() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1fr]">
      <div>
        <Badge variant="secondary">Design système gaming</Badge>
        <h2 className="mt-4 text-4xl font-black uppercase">Une interface qui montre le jeu</h2>
        <p className="mt-4 leading-8 text-muted-foreground">
          Les pages publiques utilisent des surfaces RetroUI, des ombres dures, des badges de
          statut, des SVG applicatifs et des images générées dédiées au produit. Les visuels
          décrivent les rounds, le lobby, les timers et les transitions.
        </p>
      </div>
      <PhaseFlowImage />
    </section>
  );
}
