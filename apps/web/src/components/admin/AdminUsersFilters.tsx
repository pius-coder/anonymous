import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Input } from "@/components/retroui/input";

export function AdminUsersFilters({ q, role }: { q?: string; role?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-lg uppercase">Recherche utilisateurs</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex max-w-4xl flex-wrap gap-2">
          <Input name="q" defaultValue={q ?? ""} placeholder="email, nom, pseudo, telephone ou user id" />
          <select name="role" defaultValue={role ?? ""} className="h-10 rounded-md border-2 border-border bg-background px-3 text-sm">
            <option value="">Tous les roles</option>
            <option value="PLAYER">PLAYER</option>
            <option value="SUPPORT">SUPPORT</option>
            <option value="FINANCE">FINANCE</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
          <Button type="submit">Chercher</Button>
        </form>
      </CardContent>
    </Card>
  );
}
