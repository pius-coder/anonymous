import type { Metadata } from "next";
import { adminApiGet, queryString } from "../admin-api";
import { formatDateTime, jsonPreview, shortId } from "../admin-format";
import type { AuditEntry } from "../admin-types";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Input } from "@/components/retroui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/retroui/table";

export const metadata: Metadata = {
  title: "Audit logs | Admin",
};

export default async function AdminAuditPage(props: {
  searchParams: Promise<{ action?: string; entity?: string; entityId?: string; requestId?: string }>;
}) {
  const search = await props.searchParams;
  const result = await adminApiGet<{ entries: AuditEntry[]; nextCursor: string | null }>(
    `/v1/admin/audit-logs${queryString({ ...search, limit: 50 })}`,
  );
  const entries = result?.entries ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Audit</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Audit logs</h1>
        <p className="text-sm text-muted-foreground">{entries.length} entree(s) chargee(s).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5">
            <Input name="action" defaultValue={search.action ?? ""} placeholder="action" />
            <Input name="entity" defaultValue={search.entity ?? ""} placeholder="entity" />
            <Input name="entityId" defaultValue={search.entityId ?? ""} placeholder="entityId" />
            <Input name="requestId" defaultValue={search.requestId ?? ""} placeholder="requestId" />
            <Button type="submit">Filtrer</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Journal</CardTitle>
        </CardHeader>
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
          <CardHeader>
            <CardTitle className="font-head text-lg uppercase">Derniere entree</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-2">
            <pre className="max-h-96 overflow-auto rounded border-2 border-border bg-muted p-3 text-xs">
              {jsonPreview(entries[0].oldData)}
            </pre>
            <pre className="max-h-96 overflow-auto rounded border-2 border-border bg-muted p-3 text-xs">
              {jsonPreview(entries[0].newData)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
