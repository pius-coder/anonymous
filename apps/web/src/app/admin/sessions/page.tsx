import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Button } from "@/components/retroui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sessions | Admin",
};

type DashboardResponse = {
  success: boolean;
  data?: {
    dashboard: {
      sessions: { total: number; live: number; completed: number };
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

export default async function AdminSessionsPage() {
  const dashboard = await getDashboard();
  const counts = dashboard?.data?.dashboard.sessions;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="outline">Gestion</Badge>
          <h1 className="mt-2 text-3xl font-black uppercase">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            {counts
              ? `${counts.total} totale · ${counts.live} en live · ${counts.completed} terminée(s)`
              : "Chargement…"}
          </p>
        </div>
        <Link href="/admin/sessions/new">
          <Button>+ Nouvelle session</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Liste des sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Les sessions apparaîtront ici. Utilise le Program Builder pour créer une session structurée.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
