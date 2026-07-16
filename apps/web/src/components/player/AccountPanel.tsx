"use client";

import Link from "next/link";
import { Bell, Gamepad2, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { PixelAvatar } from "@/components/ui/PixelAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";

export function AccountPanel() {
  const router = useRouter();
  const { user, loading, logout } = useSession();
  if (loading)
    return (
      <PageState
        kind="loading"
        title="Chargement du compte"
        message="Nous vérifions votre session."
      />
    );
  const name = user?.name || "Aya M.";
  const email = user?.email || "ay••@noya.cm";
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader className="items-center text-center">
          <PixelAvatar seed={name} size="lg" />
          <CardTitle>{name}</CardTitle>
          <CardDescription>Profil joueur</CardDescription>
          <Badge variant="outline">Joueur actif</Badge>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            variant="destructive"
            onClick={async () => {
              await logout();
              router.push("/auth/login");
            }}
          >
            <LogOut /> Se déconnecter
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>Seules vos informations autorisées sont affichées.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Info icon={UserRound} label="Nom public" value={name} />
            <Info icon={Mail} label="Adresse email" value={email} />
            <Info icon={ShieldCheck} label="Rôle" value="Joueur" />
            <Info icon={Gamepad2} label="Compte" value="Actif" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Accès rapides</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" render={<Link href="/me/tickets" />}>
              <Gamepad2 /> Mes parties
            </Button>
            <Button variant="outline" render={<Link href="/me/notifications" />}>
              <Bell /> Mes notifications
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-md border p-4">
      <Icon className="size-5 text-primary" />
      <div>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
