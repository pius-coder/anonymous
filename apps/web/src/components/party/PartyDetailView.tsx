"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Gamepad2,
  RefreshCw,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import {
  getPublicPartyByCode,
  sessionQueryKeys,
} from "@/services/session/sessionAdapter";
import { PublicShell } from "@/components/public/PublicShell";
import { PixelAvatar } from "@/components/ui/PixelAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";
import { Progress } from "@/components/ui/progress";

export function PartyDetailView({ partyCode }: { partyCode: string }) {
  const code = decodeURIComponent(partyCode).toUpperCase();

  const detailQuery = useQuery({
    queryKey: sessionQueryKeys.detail(code),
    queryFn: async () => {
      const result = await getPublicPartyByCode(code);
      if (!result.success) {
        throw Object.assign(new Error(result.error.message), { code: result.error.code });
      }
      return result.data;
    },
    staleTime: 20_000,
    retry: (failureCount, error) => {
      const code = (error as { code?: string }).code;
      if (code === "PARTY_NOT_FOUND" || code === "PARTY_INACCESSIBLE") return false;
      return failureCount < 2;
    },
  });

  if (detailQuery.isLoading) {
    return (
      <PublicShell>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <PageState
            kind="loading"
            title="Chargement de la partie"
            message="Récupération des informations publiques…"
          />
        </main>
      </PublicShell>
    );
  }

  if (detailQuery.isError) {
    const errCode = (detailQuery.error as { code?: string }).code;
    const isNotVisible =
      errCode === "PARTY_NOT_FOUND" || errCode === "PARTY_INACCESSIBLE";
    return (
      <PublicShell>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <PageState
            kind={isNotVisible ? "denied" : "error"}
            title={isNotVisible ? "Partie introuvable ou non publiée" : "Impossible de charger la partie"}
            message={
              isNotVisible
                ? "Ce code ne correspond à aucune session publique accessible. Elle peut être un brouillon, privée, ou avoir été retirée."
                : detailQuery.error instanceof Error
                  ? detailQuery.error.message
                  : "Erreur réseau ou serveur."
            }
            action={
              <div className="flex flex-wrap gap-2">
                <Button render={<Link href="/parties" />}>Retour au catalogue</Button>
                {!isNotVisible ? (
                  <Button type="button" variant="outline" onClick={() => void detailQuery.refetch()}>
                    <RefreshCw /> Réessayer
                  </Button>
                ) : null}
              </div>
            }
          />
        </main>
      </PublicShell>
    );
  }

  const party = detailQuery.data;
  if (!party) {
    return (
      <PublicShell>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <PageState
            kind="empty"
            title="Partie indisponible"
            message="Aucune donnée publique n’a été renvoyée pour ce code."
            action={<Button render={<Link href="/parties" />}>Retour au catalogue</Button>}
          />
        </main>
      </PublicShell>
    );
  }

  const capacity = Math.max(party.capacity, 0);
  const full = capacity > 0 && party.players >= capacity;
  const progress = capacity > 0 ? Math.min(100, (party.players / capacity) * 100) : 0;

  return (
    <PublicShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="app-eyebrow">{party.code}</p>
            <h1 className="mt-2 font-head text-3xl font-bold">{party.name}</h1>
            <p className="mt-2 text-muted-foreground">
              Informations publiques uniquement — aucune donnée d’administration ni score provisoire.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={detailQuery.isFetching}
            onClick={() => void detailQuery.refetch()}
          >
            <RefreshCw className={detailQuery.isFetching ? "animate-spin" : undefined} />
            {detailQuery.isStale ? "Actualiser (données anciennes)" : "Actualiser"}
          </Button>
        </header>
        <div className="party-details-layout">
          <div className="party-details-main">
            <Card className="party-hero-card">
              <CardHeader>
                <div className="party-card-topline">
                  <Badge variant={full ? "secondary" : "default"}>
                    {full ? "Complet" : "Places ouvertes"}
                  </Badge>
                  <Badge variant="outline">{party.entryFee}</Badge>
                </div>
                <CardTitle className="font-head text-2xl">{party.name}</CardTitle>
                <CardDescription>
                  Statut serveur : {party.serverStatus}. L’inscription ne décide ni du paiement ni de
                  l’admission live.
                </CardDescription>
              </CardHeader>
              <CardContent className="party-facts-grid">
                <Fact icon={CalendarClock} label="Départ" value={party.startsAt} />
                <Fact
                  icon={Users}
                  label="Capacité"
                  value={`${party.players}/${capacity || "—"} joueurs`}
                />
                <Fact icon={Gamepad2} label="Jeu vedette" value={party.game} />
                <Fact icon={WalletCards} label="Entrée" value={party.entryFee} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Parcours de la session</CardTitle>
                <CardDescription>Les étapes visibles côté joueur.</CardDescription>
              </CardHeader>
              <CardContent className="journey-list">
                {[
                  "Inscription (une seule place)",
                  "Paiement si requis (service dédié)",
                  "Préparation et readiness (service dédié)",
                  "Résultats après vérification admin",
                ].map((step, index) => (
                  <div key={step}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{step}</strong>
                      <small>
                        {index === 0
                          ? "Décidé uniquement par le serveur (capacité + publication)."
                          : "Hors scope de cette page — aucun contournement client."}
                      </small>
                    </div>
                    <CheckCircle2 />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="booking-card">
            <CardHeader>
              <CardTitle>Votre place</CardTitle>
              <CardDescription>
                La réservation d’inscription n’autorise pas l’accès live ni le paiement automatique.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="avatar-preview">
                <PixelAvatar seed="Vous" size="lg" />
                <span>
                  <strong>Profil joueur</strong>
                  <small>Connexion requise avant inscription</small>
                </span>
              </div>
              <div className="party-capacity">
                <div>
                  <span>Remplissage</span>
                  <strong>
                    {party.players}/{capacity || "—"}
                  </strong>
                </div>
                <Progress value={progress} />
              </div>
              <div className="booking-total">
                <span>Montant à confirmer</span>
                <strong>{party.entryFee}</strong>
              </div>
              <Button
                render={<Link href={`/parties/${party.code}/participation`} />}
                className="w-full"
                size="lg"
                disabled={full}
              >
                {full ? "Partie complète" : "Réserver ma place"} <ArrowRight />
              </Button>
              <Button render={<Link href="/parties" />} className="mt-2 w-full" variant="outline">
                Retour au catalogue
              </Button>
              <p className="booking-safety">
                <ShieldCheck /> Capacité et permission vérifiées côté serveur.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </PublicShell>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="party-fact">
      <Icon />
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}
