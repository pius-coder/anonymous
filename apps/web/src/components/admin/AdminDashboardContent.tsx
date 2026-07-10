import { Activity, AlertTriangle, CircleDollarSign, Headphones, Radio, ShieldCheck, TicketCheck, UserRoundCheck, Users, WalletCards } from "lucide-react";
import type { AdminDashboard } from "@/services/admin/types";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";
import { AdminMetricSection } from "@/components/admin/AdminMetricSection";

export function AdminDashboardContent({ dashboard }: { dashboard: AdminDashboard | null }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Arena OS</Badge>
            <Badge variant="secondary"><Activity className="size-3" /> Opérations</Badge>
          </div>
          <h1 className="retro-title mt-3 text-4xl font-black sm:text-5xl">Centre de contrôle</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/48">
            Supervision des sessions, joueurs, incidents et flux opérationnels depuis une console unifiée.
          </p>
        </div>
        <div className="premium-toolbar flex items-center gap-3 px-4 py-3">
          <span className="status-dot text-[--arena-green]" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/38">Plateforme</p>
            <p className="font-head text-xs font-black uppercase">Services surveillés</p>
          </div>
        </div>
      </div>

      {!dashboard ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="mb-2 grid size-12 place-items-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
              <ShieldCheck className="size-6" />
            </div>
            <CardTitle className="retro-title">Accès administrateur requis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/52">
              Connectez-vous avec un rôle autorisé pour consulter les indicateurs opérationnels.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          <AdminMetricSection title="Sessions et support" eyebrow="Temps réel">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminKpiCard label="Sessions totales" value={dashboard.sessions.total} icon={Radio} />
              <AdminKpiCard label="Sessions live" value={dashboard.sessions.live} icon={Activity} accent="var(--arena-green)" />
              <AdminKpiCard label="Incidents ouverts" value={dashboard.incidents.open} icon={AlertTriangle} accent="var(--arena-danger)" />
              <AdminKpiCard label="Cas support ouverts" value={dashboard.support.openCases} icon={Headphones} accent="var(--arena-gold)" />
            </div>
          </AdminMetricSection>

          <AdminMetricSection title="Utilisateurs" eyebrow="Population">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminKpiCard label="Comptes totaux" value={dashboard.users.total} icon={Users} />
              <AdminKpiCard label="Comptes actifs" value={dashboard.users.active} icon={UserRoundCheck} accent="var(--arena-green)" />
              <AdminKpiCard label="Joueurs inscrits" value={dashboard.users.players} icon={TicketCheck} accent="var(--arena-pink)" />
              <AdminKpiCard label="Comptes opérations" value={dashboard.users.operators} icon={ShieldCheck} accent="var(--arena-violet)" />
            </div>
          </AdminMetricSection>

          <AdminMetricSection title="Inscriptions" eyebrow="Préparation des sessions">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AdminKpiCard label="Inscriptions payées" value={dashboard.registrations.paid} icon={TicketCheck} accent="var(--arena-green)" />
              <AdminKpiCard label="Absences au check-in" value={dashboard.registrations.noShow} icon={AlertTriangle} accent="var(--arena-gold)" />
              <AdminKpiCard label="Actions en attente" value={dashboard.support.pendingActions} icon={Activity} accent="var(--arena-pink)" />
            </div>
          </AdminMetricSection>

          {dashboard.finance && (
            <AdminMetricSection title="Flux financiers" eyebrow="Supervision interne">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <AdminKpiCard label="Paiements en attente" value={dashboard.finance.payments.pending} icon={CircleDollarSign} accent="var(--arena-gold)" />
                <AdminKpiCard label="Paiements confirmés" value={dashboard.finance.payments.successful} icon={ShieldCheck} accent="var(--arena-green)" />
                <AdminKpiCard label="Portefeuilles gelés" value={dashboard.finance.wallets.frozen} icon={WalletCards} accent="var(--arena-danger)" />
                <AdminKpiCard label="Crédits distribués XAF" value={dashboard.finance.creditsDistributedXaf} icon={CircleDollarSign} accent="var(--arena-cyan)" />
              </div>
            </AdminMetricSection>
          )}
        </div>
      )}
    </section>
  );
}
