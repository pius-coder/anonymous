import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Input } from "@/components/retroui/input";

export function AdminAuditFilters({ search }: { search: { action?: string; entity?: string; entityId?: string; requestId?: string } }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-head text-lg uppercase">Filtres</CardTitle></CardHeader>
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
  );
}
