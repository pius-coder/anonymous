import { AlertTriangle, Clock3, LifeBuoy } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SupportQueue } from "@/components/support/SupportQueue";

export default function SupportPage() {
  return (
    <AppShell
      audience="Support"
      eyebrow="Assistance"
      title="File support"
      subtitle="Résoudre les problèmes d’accès sans exposer les données financières ni les réponses de jeu."
    >
      <div className="dashboard-stack">
        <section className="metrics-grid metrics-grid--three">
          <MetricCard
            icon={LifeBuoy}
            label="Demandes ouvertes"
            value="12"
            detail="4 assignées à vous"
            trend="up"
          />
          <MetricCard
            icon={Clock3}
            label="Temps médian"
            value="8 min"
            detail="objectif sous 15 min"
            trend="down"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Bloquantes"
            value="02"
            detail="accès à une session"
            trend="neutral"
          />
        </section>
        <SupportQueue />
      </div>
    </AppShell>
  );
}
