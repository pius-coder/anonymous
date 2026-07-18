"use client";

import type { ReactNode } from "react";
import { useSession } from "../../lib/useSession";

type AuthGuardProps = {
  children: ReactNode;
  roles?: string[];
  fallback?: ReactNode;
};

export function AuthGuard({ children, roles, fallback }: AuthGuardProps) {
  const { user, loading } = useSession();

  if (loading) return <div>Chargement...</div>;

  if (!user) {
    return fallback ?? <div>Veuillez vous connecter pour accéder à cette page.</div>;
  }

  if (roles && roles.length > 0) {
    const hasAccess = user.roles.some((r) => roles.includes(r));
    if (!hasAccess) {
      return <div>Accès refusé.</div>;
    }
  }

  return <>{children}</>;
}
