import type { AuditEntry } from "@/services/admin/types";
import { Badge } from "@/components/retroui/badge";
import { AdminAuditFilters } from "@/components/admin/AdminAuditFilters";
import { AdminAuditTable } from "@/components/admin/AdminAuditTable";

export function AdminAuditContent({ entries, search }: { entries: AuditEntry[]; search: { action?: string; entity?: string; entityId?: string; requestId?: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Audit</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Audit logs</h1>
        <p className="text-sm text-muted-foreground">{entries.length} entree(s) chargee(s).</p>
      </div>
      <AdminAuditFilters search={search} />
      <AdminAuditTable entries={entries} />
    </div>
  );
}
