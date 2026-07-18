"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getMyParticipation, isCancelledParticipation } from "@/services/participation/participationAdapter";
import { getPlayerJourneyState, nextPlayerHref } from "@/services/player/player-journey";
import { getPublicPartyByCode, sessionQueryKeys } from "@/services/session/sessionAdapter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";
import {
  formatXaf,
  mapPaymentStatusLabel,
  paymentApi,
  type PaymentDetail,
} from "@/services/payment/payment-api";

type Method = "mobile" | "card" | "wallet";

/** UI phase derived only from server payment status + local transport errors. */
type UiPhase =
  | "idle"
  | "pending"
  | "success"
  | "failed"
  | "timeout"
  | "retry"
  | "network_error";

const POLL_MS = 2_000;
const TIMEOUT_MS = 45_000;

function phaseFromServerStatus(status: string | undefined): UiPhase | null {
  if (!status) return null;
  if (status === "SUCCESSFUL") return "success";
  if (status === "FAILED" || status === "EXPIRED") return "failed";
  if (status === "PENDING" || status === "CREATED") return "pending";
  return null;
}

/** Client-side safety: only navigate to known Fapshi hosts (server already allowlists). */
function isOfficialCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "fapshi.com" || host.endsWith(".fapshi.com");
  } catch {
    return false;
  }
}

export function PaymentPanel({ partyCode }: { partyCode: string }) {
  const code = decodeURIComponent(partyCode).toUpperCase();
  const [method, setMethod] = useState<Method>("mobile");
  const [phase, setPhase] = useState<UiPhase>("idle");
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => paymentApi.newIdempotencyKey(`party-${code}`));
  const pollStartedAt = useRef<number | null>(null);

  const partyQuery = useQuery({
    queryKey: sessionQueryKeys.detail(code),
    queryFn: async () => {
      const res = await getPublicPartyByCode(code);
      if (!res.success) throw Object.assign(new Error(res.error.message), { code: res.error.code });
      return res.data;
    },
    staleTime: 20_000,
  });

  const participationQuery = useQuery({
    queryKey: ["participation", "mine", code, "payment"],
    queryFn: async () => {
      const res = await getMyParticipation(code);
      if (!res.success) throw Object.assign(new Error(res.error.message), { code: res.error.code });
      return res.data;
    },
    retry: false,
    staleTime: 10_000,
  });

  const walletQuery = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: async () => {
      const res = await paymentApi.getWallet();
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 15_000,
  });

  function applyServerPayment(detail: PaymentDetail) {
    setPayment(detail);
    const next = phaseFromServerStatus(detail.status);
    if (next) setPhase(next);
  }

  const pollStatus = useQuery({
    queryKey: ["payment-status", payment?.id],
    enabled: Boolean(payment?.id) && phase === "pending",
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "SUCCESSFUL" || data.status === "FAILED")) return false;
      if (pollStartedAt.current && Date.now() - pollStartedAt.current > TIMEOUT_MS) return false;
      return POLL_MS;
    },
    queryFn: async () => {
      if (!payment?.id) throw new Error("missing payment");
      const res = await paymentApi.getStatus(payment.id);
      if (!res.success) throw new Error(res.error.message);
      // Apply server status in the query path (not an effect) to avoid cascading renders.
      applyServerPayment(res.data);
      if (
        pollStartedAt.current &&
        Date.now() - pollStartedAt.current > TIMEOUT_MS &&
        res.data.status === "PENDING"
      ) {
        setPhase("timeout");
      }
      return res.data;
    },
  });

  const initiateMutation = useMutation({
    scope: { id: `payment-initiate-${code}` },
    mutationFn: async () => {
      const party = partyQuery.data;
      const participation = participationQuery.data;
      const res = await paymentApi.initiate({
        purpose: "ACCESS_FEE",
        productCode: code,
        idempotencyKey,
        partyId: party?.id,
        participationId: participation?.id,
      });
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (data) => {
      pollStartedAt.current = Date.now();
      applyServerPayment(data);
      if (data.status === "PENDING" || data.status === "CREATED") setPhase("pending");
      trackAnalyticsEvent("player.payment.initiated", { partyCode: code, method });
      // Open official Fapshi hosted checkout (server-returned link only; never invent).
      if (data.checkoutUrl && isOfficialCheckoutUrl(data.checkoutUrl)) {
        window.location.assign(data.checkoutUrl);
      }
    },
    onError: (err: Error) => {
      setErrorMessage(err.message);
      setPhase("network_error");
    },
  });

  const walletPayMutation = useMutation({
    scope: { id: `payment-wallet-${code}` },
    mutationFn: async () => {
      const party = partyQuery.data;
      const participation = participationQuery.data;
      const res = await paymentApi.payWithWallet({
        productCode: code,
        reason: `Droit d'entrée ${code}`,
        idempotencyKey: `${idempotencyKey}-wallet`,
        partyId: party?.id,
        participationId: participation?.id,
      });
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (data) => {
      applyServerPayment(data.payment);
      trackAnalyticsEvent("player.payment.wallet_paid", { partyCode: code });
      void walletQuery.refetch();
    },
    onError: (err: Error) => {
      setErrorMessage(err.message);
      setPhase(err.message.toLowerCase().includes("solde") ? "failed" : "network_error");
    },
  });

  function pay() {
    setErrorMessage(null);
    if (method === "wallet") {
      setPhase("pending");
      walletPayMutation.mutate();
      return;
    }
    setPhase("pending");
    initiateMutation.mutate();
  }

  function retry() {
    setErrorMessage(null);
    setPayment(null);
    pollStartedAt.current = null;
    setPhase("idle");
  }

  function verify() {
    if (!payment?.id) return;
    setPhase("pending");
    pollStartedAt.current = Date.now();
    void pollStatus.refetch().then((result) => {
      if (result.data) applyServerPayment(result.data);
      if (result.data) {
        trackAnalyticsEvent("player.payment.verified", {
          partyCode: code,
          status: result.data.status,
        });
      }
      else if (result.error) {
        setErrorMessage((result.error as Error).message);
        setPhase("retry");
      }
    });
  }

  // Keep phase in sync when React Query already holds a terminal status after remount.
  const polled = pollStatus.data;
  const effectivePhase =
    polled && phase === "pending"
      ? phaseFromServerStatus(polled.status) ?? phase
      : phase;

  const serverAmount = payment?.amount ?? polled?.amount;
  const displayPayment = payment ?? polled ?? null;
  const walletBalance = walletQuery.data?.balance;
  const party = partyQuery.data;
  const participation = participationQuery.data ?? null;
  const journeyState = party ? getPlayerJourneyState(party, participation) : null;
  const cancelled = isCancelledParticipation(participation);
  const methods = [
    {
      id: "mobile" as const,
      icon: Smartphone,
      label: "Mobile Money",
      detail: "Confirmation sur votre téléphone",
    },
    { id: "card" as const, icon: CreditCard, label: "Carte", detail: "Paiement sécurisé externe" },
    {
      id: "wallet" as const,
      icon: WalletCards,
      label: "Portefeuille",
      detail:
        walletBalance === undefined
          ? "Solde en cours de chargement…"
          : `Solde disponible : ${formatXaf(walletBalance)}`,
    },
  ];

  const amountLabel =
    serverAmount !== undefined
      ? formatXaf(serverAmount)
      : party?.entryFeeLabel ?? "Montant en cours de chargement";

  if (partyQuery.isLoading || participationQuery.isLoading) {
    return (
      <PageState
        kind="loading"
        title="Chargement du paiement"
        message="Vérification de la partie, de votre participation et du montant serveur…"
      />
    );
  }

  if (partyQuery.isError) {
    return (
      <PageState
        kind="error"
        title="Paiement indisponible"
        message={partyQuery.error instanceof Error ? partyQuery.error.message : "Impossible de charger la partie."}
        action={<Button render={<Link href="/parties" />}>Retour au catalogue</Button>}
      />
    );
  }

  if (participationQuery.isError) {
    const codeValue = (participationQuery.error as { code?: string }).code;
    return (
      <PageState
        kind={codeValue === "UNAUTHENTICATED" ? "denied" : "error"}
        title={codeValue === "UNAUTHENTICATED" ? "Connexion requise" : "Paiement indisponible"}
        message={
          participationQuery.error instanceof Error
            ? participationQuery.error.message
            : "Impossible de charger votre participation."
        }
        action={<Button render={<Link href={`/parties/${code}/participation`} />}>Voir mon inscription</Button>}
      />
    );
  }

  if (!party || !participation || cancelled) {
    return (
      <PageState
        kind="denied"
        title="Participation requise"
        message="Vous devez disposer d’une participation active avant de payer cette partie."
        action={<Button render={<Link href={`/parties/${code}/participation`} />}>Ouvrir l’inscription</Button>}
      />
    );
  }

  if (participation.paymentState === "PAID" || journeyState === "preparation-ready" || journeyState === "live-ready" || journeyState === "results") {
    return (
      <div className="space-y-4">
        <PageState
          kind="success"
          title="Paiement déjà confirmé"
          message="Votre participation est déjà payée. Vous pouvez reprendre le parcours joueur sans second débit."
          action={
            <Button render={<Link href={nextPlayerHref(party, participation)} />}>
              Continuer <ArrowRight />
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline">PAIEMENT REQUIS</Badge>
            <strong>{amountLabel}</strong>
          </div>
          <CardTitle>Choisissez un moyen de paiement</CardTitle>
          <CardDescription>
            Le montant et le statut viennent du serveur. Aucun débit n’est inventé côté navigateur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {methods.map(({ id, icon: Icon, label, detail }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                className={`flex items-center gap-4 rounded-md border p-4 text-left transition-colors ${method === id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                aria-pressed={method === id}
                disabled={effectivePhase === "pending" || effectivePhase === "success"}
              >
                <span className="grid size-10 place-items-center rounded-md bg-muted">
                  <Icon className="size-5" />
                </span>
                <span className="flex-1">
                  <strong className="block">{label}</strong>
                  <small className="text-muted-foreground">{detail}</small>
                </span>
                <span
                  className={`size-4 rounded-full border-4 ${method === id ? "border-primary" : "border-muted-foreground"}`}
                />
              </button>
            ))}
          </div>

          {effectivePhase === "pending" ? (
            <PageState
              kind="loading"
              title="Paiement en cours"
              message={
                displayPayment
                  ? `Statut serveur : ${mapPaymentStatusLabel(displayPayment.status)}. Ne relancez pas un second débit.`
                  : "Transmission au serveur… Ne relancez pas un second débit."
              }
            />
          ) : null}
          {effectivePhase === "pending" &&
          displayPayment?.checkoutUrl &&
          isOfficialCheckoutUrl(displayPayment.checkoutUrl) ? (
            <a
              href={displayPayment.checkoutUrl}
              rel="noopener noreferrer"
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-secondary px-2.5 text-sm font-medium text-secondary-foreground"
            >
              Ouvrir le checkout Fapshi
              <ArrowRight className="size-4" />
            </a>
          ) : null}
          {effectivePhase === "success" ? (
            <PageState
              kind="success"
              title="Paiement confirmé"
              message="Votre participation est débloquée et l’accès à la préparation est disponible."
            />
          ) : null}
          {effectivePhase === "failed" ? (
            <PageState
              kind="error"
              title="Paiement échoué"
              message={errorMessage ?? "Le serveur a marqué la transaction comme échouée."}
            />
          ) : null}
          {effectivePhase === "timeout" ? (
            <PageState
              kind="error"
              title="Délai dépassé"
              message="Le prestataire n’a pas confirmé à temps. Vérifiez le statut ou réessayez avec une nouvelle clé d’idempotence."
            />
          ) : null}
          {effectivePhase === "network_error" || effectivePhase === "retry" ? (
            <PageState
              kind="error"
              title="Erreur de communication"
              message={errorMessage ?? "Impossible de contacter l’API paiement."}
            />
          ) : null}

          {effectivePhase === "idle" ? (
            <Button className="w-full" size="lg" onClick={pay}>
              Payer {amountLabel} <ArrowRight />
            </Button>
          ) : null}
          {effectivePhase === "pending" && displayPayment?.id ? (
            <Button className="w-full" variant="outline" onClick={verify}>
              <RefreshCw /> Vérifier le paiement
            </Button>
          ) : null}
          {effectivePhase === "timeout" ||
          effectivePhase === "failed" ||
          effectivePhase === "network_error" ||
          effectivePhase === "retry" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {displayPayment?.id ? (
                <Button variant="outline" onClick={verify}>
                  <RefreshCw /> Vérifier
                </Button>
              ) : null}
              <Button onClick={retry}>Réessayer</Button>
            </div>
          ) : null}
          {effectivePhase === "success" ? (
            <Button
              className="w-full"
              size="lg"
              render={<Link href={nextPlayerHref(party, { ...participation, paymentState: "PAID" })} />}
            >
              Accéder à la préparation <ArrowRight />
            </Button>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
          <CardDescription>Participation {party.code}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between border-b pb-3 text-sm">
            <span>{party.name}</span>
            <strong>{amountLabel}</strong>
          </div>
          <div className="flex justify-between text-sm">
            <span>Version</span>
            <strong>config v{party.configVersion} · fee v{party.feeVersion}</strong>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total (serveur)</span>
            <strong className="text-lg">{amountLabel}</strong>
          </div>
          {displayPayment ? (
            <div className="space-y-1 rounded-md border p-3 text-sm">
              <div className="flex justify-between">
                <span>Référence</span>
                <span className="font-mono text-xs">{displayPayment.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Statut</span>
                <Badge variant="outline">{mapPaymentStatusLabel(displayPayment.status)}</Badge>
              </div>
            </div>
          ) : null}
          <p className="flex gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <ShieldCheck className="size-5 shrink-0" />
            Aucune donnée sensible du prestataire n’est affichée. Les gains ne sont jamais crédités ici.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
