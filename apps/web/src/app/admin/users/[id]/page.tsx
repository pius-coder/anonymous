import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminApiGet } from "../../admin-api";
import { formatDateTime, formatXaf, shortId } from "../../admin-format";
import type { SupportUser } from "../../admin-types";
import { SupportCaseForm, WalletAdjustForm } from "@/components/admin/AdminActionForms";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
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
  title: "Utilisateur | Admin",
};

export default async function AdminUserDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const result = await adminApiGet<{ user: SupportUser }>(`/v1/admin/support/users/${id}`);
  const user = result?.user;
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="outline">{user.role}</Badge>
          <h1 className="mt-2 text-3xl font-black uppercase">{user.name ?? user.email}</h1>
          <p className="font-mono text-sm text-muted-foreground">{user.id}</p>
        </div>
        <Link href="/admin/users">
          <Button variant="outline">Retour utilisateurs</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Email</CardTitle>
          </CardHeader>
          <CardContent className="break-all text-sm font-semibold">{user.email}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Telephone</CardTitle>
          </CardHeader>
          <CardContent>{user.phone ?? "Non renseigne"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Compte</CardTitle>
          </CardHeader>
          <CardContent>{user.isActive ? "Actif" : "Suspendu"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Creation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{formatDateTime(user.createdAt)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-head text-lg uppercase">Profil joueur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="text-muted-foreground">Pseudo: </span>
              {user.profile?.username ?? "Aucun"}
            </p>
            <p>
              <span className="text-muted-foreground">Profil public: </span>
              {user.profile?.isPublic ? "Oui" : "Non"}
            </p>
            <p>
              <span className="text-muted-foreground">Niveau: </span>
              {user.profile?.level ?? 0}
            </p>
            <p>
              <span className="text-muted-foreground">XP: </span>
              {user.profile?.xp ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-head text-lg uppercase">Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-2xl font-semibold">
                {user.wallet ? formatXaf(user.wallet.balanceXaf, user.wallet.currency) : "Aucun wallet"}
              </p>
              {user.wallet?.isFrozen && <Badge variant="outline">Gele</Badge>}
            </div>
            <WalletAdjustForm defaultUserId={user.id} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Inscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {user.registrations.length === 0 ? (
            <p className="text-muted-foreground">Aucune inscription.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.registrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell>
                      <Link
                        href={`/admin/sessions/${registration.session.id}`}
                        className="underline underline-offset-2"
                      >
                        {registration.session.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{registration.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(registration.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {user.payments.length === 0 ? (
            <p className="text-muted-foreground">Aucun paiement.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono">{shortId(payment.id)}</TableCell>
                    <TableCell>{formatXaf(payment.amountXaf, payment.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(payment.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-head text-lg uppercase">Cas support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SupportCaseForm userId={user.id} />
            {user.supportCases.length === 0 ? (
              <p className="text-muted-foreground">Aucun cas support.</p>
            ) : (
              user.supportCases.map((supportCase) => (
                <div key={supportCase.id} className="border-t-2 border-border pt-3">
                  <p className="font-medium">{supportCase.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {supportCase.status} - {formatDateTime(supportCase.createdAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-head text-lg uppercase">Wallet ledger</CardTitle>
          </CardHeader>
          <CardContent>
            {user.wallet?.ledgers.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.wallet.ledgers.map((ledger) => (
                    <TableRow key={ledger.id}>
                      <TableCell>{ledger.type}</TableCell>
                      <TableCell>{ledger.direction}</TableCell>
                      <TableCell>{formatXaf(ledger.amountXaf, user.wallet?.currency ?? "XAF")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Ledger non disponible.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
