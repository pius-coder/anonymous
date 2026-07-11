"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/retroui/button";
import { AuthDrawer } from "@/components/auth/AuthDrawer";
import { RegisterDrawer, type RegisterSessionInput } from "@/components/auth/RegisterDrawer";
import { apiGet } from "@/lib/api";
import { useSession } from "@/lib/useSession";

export function SessionInscriptionCTA({
  session,
  disabled,
  disabledReason,
}: {
  session: RegisterSessionInput;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { user, loading } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [regOpen, setRegOpen] = useState(false);
  const [registration, setRegistration] = useState<{ id: string; status: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    void apiGet<{ registration: { id: string; status: string } }>(
      `/sessions/${session.id}/registration`,
    ).then((result) => {
      if (result.ok) setRegistration(result.data.registration);
      else setRegistration(null);
    });
  }, [session.id, user]);

  if (loading) {
    return (
      <Button size="lg" disabled className="h-10 px-4">
        …
      </Button>
    );
  }

  if (disabled) {
    return (
      <Button size="lg" disabled className="h-10 px-4">
        {disabledReason ?? "Inscription indisponible"}
      </Button>
    );
  }

  if (!user) {
    return (
      <AuthDrawer
        defaultTab="register"
        open={authOpen}
        onOpenChange={setAuthOpen}
        next={`/session/${session.code}`}
        trigger={
          <Button size="lg" className="h-10 px-4">
            S&apos;inscrire à cette session
          </Button>
        }
      />
    );
  }

  if (registration?.status === "PAID") {
    return (
      <Link href={`/session/${session.code}/lobby`}>
        <Button size="lg" disabled={disabled} className="h-10 px-4">
          Lobby
        </Button>
      </Link>
    );
  }

  if (
    (registration?.status === "CHECKED_IN" || registration?.status === "IN_ROOM") &&
    session.status === "LIVE"
  ) {
    return (
      <Link href={`/session/${session.code}/live`}>
        <Button size="lg" disabled={disabled} className="h-10 px-4">
          Rejoindre le live
        </Button>
      </Link>
    );
  }

  if (session.status === "COMPLETED") {
    return (
      <Link href={`/session/${session.code}/results`}>
        <Button size="lg" disabled={disabled} className="h-10 px-4">
          Résultats
        </Button>
      </Link>
    );
  }

  return (
    <RegisterDrawer
      session={session}
      open={regOpen}
      onOpenChange={setRegOpen}
      triggerDisabled={disabled}
      trigger={
        <Button size="lg" className="h-10 px-4">
          {registration?.status === "PAYMENT_PENDING"
            ? "Finaliser le paiement"
            : "S'inscrire à cette session"}
        </Button>
      }
      onRegistered={() => {
        setRegistration(null);
        void apiGet<{ registration: { id: string; status: string } }>(
          `/sessions/${session.id}/registration`,
        ).then((result) => {
          if (result.ok) setRegistration(result.data.registration);
        });
      }}
    />
  );
}
