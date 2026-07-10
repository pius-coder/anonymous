import type { Metadata } from "next";
import Link from "next/link";
import { adminApiGet, queryString } from "../admin-api";
import { formatDateTime, formatXaf, shortId } from "../admin-format";
import type { Paginated, PaymentTransaction } from "../admin-types";
import { PaymentReconcileForm } from "@/components/admin/AdminActionForms";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/retroui/table";

export const metadata: Metadata = {
  title: "Paiements | Admin",
};

export default async function AdminPaymentsPage(props: {
  searchParams: Promise<{ status?: string; userId?: string; sessionId?: string }>;
}) {
  const search = await props.searchParams;
  const payments = await adminApiGet<Paginated<PaymentTransaction>>(
    `/v1/admin/payments${queryString({ ...search, limit: 50 })}`,
  );
  const rows = payments?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Finance</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Paiements</h1>
        <p className="text-sm text-muted-foreground">
          {payments ? `${payments.meta.total} transaction(s)` : "Donnees indisponibles"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground">Aucune transaction.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono">{shortId(payment.id)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/users/${encodeURIComponent(payment.user.id)}`}
                        className="underline underline-offset-2"
                      >
                        {payment.user.name ?? payment.user.email}
                      </Link>
                    </TableCell>
                    <TableCell>{payment.session?.code ?? "Aucune"}</TableCell>
                    <TableCell>{formatXaf(payment.amountXaf, payment.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.status}</Badge>
                    </TableCell>
                    <TableCell>{shortId(payment.providerTransId)}</TableCell>
                    <TableCell>{formatDateTime(payment.createdAt)}</TableCell>
                    <TableCell>
                      <PaymentReconcileForm paymentId={payment.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
