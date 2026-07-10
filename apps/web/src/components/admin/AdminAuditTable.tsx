import type { AuditEntry } from "@/services/admin/types";
import { formatDateTime, jsonPreview, shortId } from "@/app/admin/admin-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/retroui/table";

export function AdminAuditTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="font-head text-lg uppercase">Journal</CardTitle></CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground">Aucune entree.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entite</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Request</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                    <TableCell>
                      <div>{entry.entity}</div>
                      <div className="font-mono text-xs text-muted-foreground">{shortId(entry.entityId)}</div>
                    </TableCell>
                    <TableCell>{entry.reason ?? "Non renseignee"}</TableCell>
                    <TableCell className="font-mono text-xs">{shortId(entry.requestId)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {entries[0] && (
        <Card>
          <CardHeader><CardTitle className="font-head text-lg uppercase">Derniere entree</CardTitle></CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-2">
            <pre className="max-h-96 overflow-auto rounded border-2 border-border bg-muted p-3 text-xs">{jsonPreview(entries[0].oldData)}</pre>
            <pre className="max-h-96 overflow-auto rounded border-2 border-border bg-muted p-3 text-xs">{jsonPreview(entries[0].newData)}</pre>
          </CardContent>
        </Card>
      )}
    </>
  );
}
