import { AppShell } from "@/components/ui/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserDirectory } from "@/components/admin/UserDirectory";

export default function AdminUsersPage() {
  return <AppShell audience="Support" eyebrow="Comptes et accès" title="Utilisateurs" subtitle="Consulter un compte, assister un joueur et gérer les accès autorisés.">
    <Card className="full-height-card"><CardHeader><CardTitle>Annuaire</CardTitle><CardDescription>Les actions sensibles restent réservées aux rôles autorisés.</CardDescription></CardHeader><CardContent className="min-h-0 flex-1 p-0"><UserDirectory /></CardContent></Card>
  </AppShell>;
}
