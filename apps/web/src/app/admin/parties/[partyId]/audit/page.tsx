"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { use } from "react";
import { AdminSection, AdminTable, PartyAdminNav, adminCell } from "@/components/admin/AdminWorkspace";
import { AppShell } from "@/components/ui/AppShell";
import { Input } from "@/components/ui/input";
import { listPartyAudit } from "@/services/admin/adminPartyClient";

export default function AdminPartyAuditPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId: raw } = use(params);
  const partyId = decodeURIComponent(raw);
  const [q, setQ] = useState("");

  const auditQuery = useQuery({
    queryKey: ["admin", "audit", partyId],
    queryFn: async () => {
      const res = await listPartyAudit(partyId);
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data.events;
    },
    refetchInterval: 15_000,
  });

  const events = useMemo(() => {
    const all = auditQuery.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (e) =>
        e.action.toLowerCase().includes(needle) ||
        (e.reason ?? "").toLowerCase().includes(needle) ||
        (e.actorUserId ?? "").toLowerCase().includes(needle) ||
        (e.result ?? "").toLowerCase().includes(needle),
    );
  }, [auditQuery.data, q]);

  return (
    <AppShell
      audience="Admin"
      eyebrow="Audit commande"
      title="Timeline d’audit"
      subtitle="Événements serveur pour cette partie. Aucune entrée fictive."
    >
      <div className="space-y-4">
        <PartyAdminNav partyId={partyId} current="audit" />
        <AdminSection
          title="Événements"
          description="Lecture seule"
          action={
            <Input
              className="w-64"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Action, acteur ou motif"
            />
          }
        >
          {auditQuery.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
          ) : null}
          {auditQuery.isError ? (
            <p className="p-4 text-sm text-rose-300" role="alert">
              {auditQuery.error instanceof Error ? auditQuery.error.message : "Erreur"}
            </p>
          ) : null}
          {!auditQuery.isLoading && !auditQuery.isError && events.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun événement d’audit pour cette partie.</p>
          ) : null}
          {events.length > 0 ? (
            <AdminTable
              headers={["Date", "Action", "Acteur", "Résultat", "Motif"]}
              label="Timeline audit"
            >
              {events.map((e) => (
                <tr key={e.id}>
                  <td className={adminCell}>{new Date(e.createdAt).toLocaleString()}</td>
                  <td className={`${adminCell} font-mono text-xs`}>{e.action}</td>
                  <td className={adminCell}>{e.actorUserId ?? "—"}</td>
                  <td className={adminCell}>{e.result ?? "—"}</td>
                  <td className={adminCell}>{e.reason ?? "—"}</td>
                </tr>
              ))}
            </AdminTable>
          ) : null}
        </AdminSection>
      </div>
    </AppShell>
  );
}
