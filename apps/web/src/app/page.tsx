import Link from "next/link";
import { Activity, ArrowRight, CircleDollarSign, Gamepad2, Radio, Users } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyDataTable } from "@/components/dashboard/PartyDataTable";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { uiParties } from "@/lib/ui-data";

export default function HomePage() {
  return (
    <AppShell
      audience="Admin"
      eyebrow="Vue opérationnelle"
      title="Centre de contrôle"
      subtitle="Les sessions, joueurs et signaux qui demandent votre attention maintenant."
      actions={<Badge className="live-badge"><Radio /> Live stable</Badge>}
    >
      <div className="dashboard-stack">
        <section className="metrics-grid" aria-label="Indicateurs principaux">
          <MetricCard icon={Gamepad2} label="Sessions actives" value="06" detail="2 en préparation" trend="up" />
          <MetricCard icon={Users} label="Joueurs connectés" value="48" detail="sur 63 inscrits" trend="up" />
          <MetricCard icon={CircleDollarSign} label="Volume du jour" value="184k" detail="FCFA encaissés" trend="up" />
          <MetricCard icon={Activity} label="Incidents ouverts" value="02" detail="aucun critique" trend="down" />
        </section>

        <div className="dashboard-columns">
          <Card className="dashboard-table-card">
            <CardHeader className="border-b">
              <CardTitle>Sessions à surveiller</CardTitle>
              <CardDescription>Une ligne ouvre sa fiche complète dans un Sheet RetroUI.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-0">
              <PartyDataTable parties={uiParties.slice(0, 4)} compact />
            </CardContent>
            <div className="dashboard-card-action">
              <Button variant="ghost" render={<Link href="/admin/parties" />}>
                Toutes les sessions <ArrowRight />
              </Button>
            </div>
          </Card>

          <Card className="activity-card">
            <CardHeader>
              <CardTitle>Activité live</CardTitle>
              <CardDescription>Derniers événements utiles</CardDescription>
            </CardHeader>
            <CardContent className="activity-feed" data-scroll-region="activity">
              {[
                ["Round démarré", "Nuit des stratèges", "il y a 2 min"],
                ["Paiement confirmé", "Aya M. · 5 000 FCFA", "il y a 4 min"],
                ["Joueur reconnecté", "Malo K. · ORBIT-08", "il y a 7 min"],
                ["Préparation ouverte", "Le cercle des rapides", "il y a 12 min"],
              ].map(([title, detail, time], index) => (
                <div className="activity-item" key={title + time}>
                  <span className={index === 0 ? "activity-dot activity-dot--live" : "activity-dot"} />
                  <div><strong>{title}</strong><small>{detail}</small></div>
                  <time>{time}</time>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
