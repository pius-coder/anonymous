import type { Metadata } from "next";
import { adminApiGet } from "./admin-api";
import type { AdminDashboard } from "./admin-types";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

export const metadata: Metadata = {
  title: "Admin Operations | Session Jeu",
  description: "Tableau de bord operations, audit et support pour Session Jeu.",
};

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const result = await adminApiGet<{ dashboard: AdminDashboard }>("/v1/admin/dashboard");
  const dashboard = result?.dashboard;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Badge variant="outline">Operations</Badge>
        <h1 className="mt-3 text-4xl font-black uppercase">Admin Dashboard</h1>
      </div>

      {!dashboard ? (
        <Card>
          <CardHeader>
            <CardTitle>Acces admin requis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Connectez-vous avec un role autorise pour consulter les indicateurs operations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="mb-4 text-lg font-semibold">Sessions et support</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Sessions totales" value={dashboard.sessions.total} />
              <KpiCard label="Sessions live" value={dashboard.sessions.live} />
              <KpiCard label="Incidents ouverts" value={dashboard.incidents.open} />
              <KpiCard label="Cas support ouverts" value={dashboard.support.openCases} />
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-lg font-semibold">Utilisateurs</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Comptes totaux" value={dashboard.users.total} />
              <KpiCard label="Comptes actifs" value={dashboard.users.active} />
              <KpiCard label="Joueurs inscrits" value={dashboard.users.players} />
              <KpiCard label="Comptes operations" value={dashboard.users.operators} />
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-lg font-semibold">Inscriptions</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard label="Inscriptions payees" value={dashboard.registrations.paid} />
              <KpiCard label="No-show" value={dashboard.registrations.noShow} />
              <KpiCard label="Actions en attente" value={dashboard.support.pendingActions} />
            </div>
          </section>

          {dashboard.finance && (
            <section>
              <h3 className="mb-4 text-lg font-semibold">Finance</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Paiements pending" value={dashboard.finance.payments.pending} />
                <KpiCard
                  label="Paiements successful"
                  value={dashboard.finance.payments.successful}
                />
                <KpiCard label="Wallets geles" value={dashboard.finance.wallets.frozen} />
                <KpiCard
                  label="Credits distribues XAF"
                  value={dashboard.finance.creditsDistributedXaf}
                />
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
