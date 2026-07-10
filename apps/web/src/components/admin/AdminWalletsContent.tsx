import type { AdminDashboard } from "@/services/admin/types";
import { formatXaf } from "@/app/admin/admin-format";
import { WalletAdjustForm } from "@/components/admin/AdminActionForms";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

export function AdminWalletsContent({ finance }: { finance: AdminDashboard["finance"] }) {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Finance</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Wallets</h1>
        <p className="text-sm text-muted-foreground">Ajustements controles par raison et idempotence.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Wallets geles</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{finance?.wallets.frozen ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Credits distribues</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{formatXaf(finance?.creditsDistributedXaf ?? 0)}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="font-head text-lg uppercase">Ajustement manuel</CardTitle></CardHeader>
        <CardContent><WalletAdjustForm /></CardContent>
      </Card>
    </div>
  );
}
