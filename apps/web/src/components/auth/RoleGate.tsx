"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/PageState";
import { useSession } from "@/lib/useSession";

export function RoleGate({ children, roles }: { children: ReactNode; roles: readonly string[] }) {
  const pathname = usePathname();
  const { user, loading, error, refresh } = useSession();

  if (loading) {
    return <GateFrame><PageState kind="loading" title="Vérification de la session" message="Chargement de vos accès autorisés." /></GateFrame>;
  }

  if (!user) {
    const returnTo = encodeURIComponent(pathname);
    return (
      <GateFrame>
        <PageState
          kind={error ? "error" : "denied"}
          title={error ? "Session indisponible" : "Connexion requise"}
          message={error ?? "Connectez-vous pour ouvrir cet espace."}
          action={<Button render={<Link href={`/auth/login?returnTo=${returnTo}`} />}>Se connecter</Button>}
        />
      </GateFrame>
    );
  }

  if (!user.roles.some((role) => roles.includes(role))) {
    return (
      <GateFrame>
        <PageState
          kind="denied"
          title="Accès refusé"
          message="Votre rôle actuel ne permet pas d’ouvrir cette interface."
          action={<Button variant="outline" onClick={() => void refresh()}>Actualiser mes droits</Button>}
        />
      </GateFrame>
    );
  }

  return children;
}

function GateFrame({ children }: { children: ReactNode }) {
  return <main className="grid h-dvh place-items-center overflow-y-auto p-4"><div className="w-full max-w-xl">{children}</div></main>;
}
