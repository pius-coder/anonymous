import type { PaymentTransaction } from "@/services/admin/types";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { AdminPaymentsTable } from "@/components/admin/AdminPaymentsTable";

export function AdminPaymentsContent({ payments, total }: { payments: PaymentTransaction[]; total: number }) {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Finance</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Paiements</h1>
        <p className="text-sm text-muted-foreground">{total > 0 ? `${total} transaction(s)` : "Donnees indisponibles"}</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="font-head text-lg uppercase">Transactions</CardTitle></CardHeader>
        <CardContent><AdminPaymentsTable payments={payments} /></CardContent>
      </Card>
    </div>
  );
}
