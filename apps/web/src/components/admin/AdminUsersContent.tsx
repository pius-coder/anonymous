import type { SupportUserSummary } from "@/services/admin/types";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { AdminUsersFilters } from "@/components/admin/AdminUsersFilters";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

export function AdminUsersContent({ rows, q, role, total }: { rows: SupportUserSummary[]; q?: string; role?: string; total: number }) {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Support</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground">{total > 0 ? `${total} compte(s) trouve(s)` : "Donnees indisponibles"}</p>
      </div>
      <AdminUsersFilters q={q} role={role} />
      <Card>
        <CardHeader><CardTitle className="font-head text-lg uppercase">Comptes inscrits</CardTitle></CardHeader>
        <CardContent><AdminUsersTable rows={rows} /></CardContent>
      </Card>
    </div>
  );
}
