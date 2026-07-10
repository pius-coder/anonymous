import Link from "next/link";
import type { SupportUser } from "@/services/admin/types";
import { formatDateTime } from "@/app/admin/admin-format";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { AdminUserProfileCard } from "@/components/admin/AdminUserProfileCard";
import { AdminUserWalletCard } from "@/components/admin/AdminUserWalletCard";
import { AdminUserRegistrationsTable } from "@/components/admin/AdminUserRegistrationsTable";
import { AdminUserPaymentsTable } from "@/components/admin/AdminUserPaymentsTable";
import { AdminUserSupportCases } from "@/components/admin/AdminUserSupportCases";
import { AdminUserLedgerTable } from "@/components/admin/AdminUserLedgerTable";

export function AdminUserDetailContent({ user }: { user: SupportUser }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="outline">{user.role}</Badge>
          <h1 className="mt-2 text-3xl font-black uppercase">{user.name ?? user.email}</h1>
          <p className="font-mono text-sm text-muted-foreground">{user.id}</p>
        </div>
        <Link href="/admin/users"><Button variant="outline">Retour utilisateurs</Button></Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Email</CardTitle></CardHeader>
          <CardContent className="break-all text-sm font-semibold">{user.email}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Telephone</CardTitle></CardHeader>
          <CardContent>{user.phone ?? "Non renseigne"}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Compte</CardTitle></CardHeader>
          <CardContent>{user.isActive ? "Actif" : "Suspendu"}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Creation</CardTitle></CardHeader>
          <CardContent className="text-sm">{formatDateTime(user.createdAt)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminUserProfileCard user={user} />
        <AdminUserWalletCard user={user} />
      </div>

      <Card>
        <CardHeader><CardTitle className="font-head text-lg uppercase">Inscriptions</CardTitle></CardHeader>
        <CardContent><AdminUserRegistrationsTable user={user} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-head text-lg uppercase">Paiements</CardTitle></CardHeader>
        <CardContent><AdminUserPaymentsTable user={user} /></CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminUserSupportCases user={user} />
        <Card>
          <CardHeader><CardTitle className="font-head text-lg uppercase">Wallet ledger</CardTitle></CardHeader>
          <CardContent><AdminUserLedgerTable user={user} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
