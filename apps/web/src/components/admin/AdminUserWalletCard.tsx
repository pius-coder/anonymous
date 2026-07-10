import type { SupportUser } from "@/services/admin/types";
import { formatXaf } from "@/app/admin/admin-format";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { WalletAdjustForm } from "@/components/admin/AdminActionForms";

export function AdminUserWalletCard({ user }: { user: SupportUser }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-head text-lg uppercase">Wallet</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-semibold">{user.wallet ? formatXaf(user.wallet.balanceXaf, user.wallet.currency) : "Aucun wallet"}</p>
          {user.wallet?.isFrozen && <Badge variant="outline">Gele</Badge>}
        </div>
        <WalletAdjustForm defaultUserId={user.id} />
      </CardContent>
    </Card>
  );
}
