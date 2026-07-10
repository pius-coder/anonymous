import type { SupportUser } from "@/services/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

export function AdminUserProfileCard({ user }: { user: SupportUser }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-head text-lg uppercase">Profil joueur</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p><span className="text-muted-foreground">Pseudo: </span>{user.profile?.username ?? "Aucun"}</p>
        <p><span className="text-muted-foreground">Profil public: </span>{user.profile?.isPublic ? "Oui" : "Non"}</p>
        <p><span className="text-muted-foreground">Niveau: </span>{user.profile?.level ?? 0}</p>
        <p><span className="text-muted-foreground">XP: </span>{user.profile?.xp ?? 0}</p>
      </CardContent>
    </Card>
  );
}
