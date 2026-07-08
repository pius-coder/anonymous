import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin Operations | Session Jeu",
  description: "Tableau de bord operations, audit et support pour Session Jeu.",
};

type DashboardResponse = {
  success: boolean;
  data?: {
    dashboard: {
      role: string;
      sessions: { total: number; live: number; completed: number };
      registrations: { paid: number; noShow: number };
      incidents: { open: number };
      support: { openCases: number; pendingActions: number };
      finance: null | {
        payments: { pending: number; successful: number; failed: number };
        wallets: { frozen: number };
        creditsDistributedXaf: number;
      };
    };
  };
};

async function getDashboard(): Promise<DashboardResponse | null> {
  const apiBase = process.env.API_URL || "http://localhost:3001";
  const cookieHeader = (await cookies()).toString();

  try {
    const res = await fetch(`${apiBase}/v1/admin/dashboard`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

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
  const result = await getDashboard();
  const dashboard = result?.data?.dashboard;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/">
            <h1 className="text-xl font-bold">Session Jeu</h1>
          </Link>
          <nav className="flex gap-4">
            <Link href="/catalogue">
              <Button variant="ghost">Catalogue</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase text-muted-foreground">Operations</p>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
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
      </main>
    </div>
  );
}
