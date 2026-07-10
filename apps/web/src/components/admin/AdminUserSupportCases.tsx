import type { SupportUser } from "@/services/admin/types";
import { formatDateTime } from "@/app/admin/admin-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { SupportCaseForm } from "@/components/admin/AdminActionForms";

export function AdminUserSupportCases({ user }: { user: SupportUser }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-head text-lg uppercase">Cas support</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <SupportCaseForm userId={user.id} />
        {user.supportCases.length === 0 ? (
          <p className="text-muted-foreground">Aucun cas support.</p>
        ) : (
          user.supportCases.map((supportCase) => (
            <div key={supportCase.id} className="border-t-2 border-border pt-3">
              <p className="font-medium">{supportCase.subject}</p>
              <p className="text-xs text-muted-foreground">{supportCase.status} - {formatDateTime(supportCase.createdAt)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
