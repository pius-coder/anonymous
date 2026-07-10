"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/retroui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/retroui/alert-dialog";
import { Badge } from "@/components/retroui/badge";
import { apiGet, apiPost, type ApiError } from "@/lib/api";
import { translateError } from "@/lib/errors.fr";

type Payment = {
  id: string;
  registrationId: string;
  amountXaf: number;
  currency: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED" | "REFUNDED" | "CREATED";
  createdAt: string;
  updatedAt: string;
};

const POLL_MS = 3000;
const PAYMENT_DEADLINE_MS = 24 * 60 * 60 * 1000;

function statusVisual(status: Payment["status"]) {
  switch (status) {
    case "SUCCESSFUL":
      return { label: "Payé", tone: "text-[--arena-green]", emoji: "✅" };
    case "PENDING":
    case "CREATED":
      return { label: "En attente", tone: "text-[--arena-gold]", emoji: "⏳" };
    case "FAILED":
      return { label: "Échoué", tone: "text-[--arena-danger]", emoji: "❌" };
    case "EXPIRED":
      return { label: "Expiré", tone: "text-[--arena-danger]", emoji: "⌛" };
    case "REFUNDED":
      return { label: "Remboursé", tone: "text-muted-foreground", emoji: "↩️" };
  }
}

export default function PaymentStatusPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deadline] = useState(() => Date.now() + PAYMENT_DEADLINE_MS);
  const [now, setNow] = useState<number>(0);
  const aborted = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    aborted.current = false;
    const poll = async () => {
      if (aborted.current) return;
      const res = await apiGet<{ payment: Payment }>(`/payments/${id}/status`);
      if (aborted.current) return;
      if (res.ok) {
        setPayment(res.data.payment);
        if (res.data.payment.status === "SUCCESSFUL") {
          setTimeout(() => router.push(`/me/sessions`), 1200);
          return;
        }
        if (res.data.payment.status === "FAILED" || res.data.payment.status === "EXPIRED") {
          return;
        }
      } else {
        setError(res.error);
      }
      if (!aborted.current) setTimeout(poll, POLL_MS);
    };
    if (payment === null) poll();
    return () => {
      aborted.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const visual = payment ? statusVisual(payment.status) : null;
  const remainingMs = deadline ? Math.max(0, deadline - now) : 0;
  const remainingMin = Math.ceil(remainingMs / 60000);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full border-2 border-border bg-card p-6 shadow-md">
        <h1 className="font-head text-3xl font-black uppercase">Paiement</h1>
        <p className="mt-1 text-sm text-muted-foreground">Suivi en temps réel de ta transaction.</p>

        {error && (
          <p className="mt-4 font-bold text-[--arena-danger]">{translateError(error.code, error.status)}</p>
        )}

        {payment && visual && (
          <div className="mt-6 grid gap-4">
            <div className="flex items-center justify-center gap-3 text-4xl" aria-live="polite">
              <span>{visual.emoji}</span>
              <span className={`font-head text-2xl font-black uppercase ${visual.tone}`}>{visual.label}</span>
            </div>
            <dl className="grid gap-1 text-sm">
              <div className="flex justify-between border-b-2 border-border pb-1">
                <dt className="text-muted-foreground">Montant</dt>
                <dd className="font-bold">
                  {new Intl.NumberFormat("fr-FR").format(payment.amountXaf)} {payment.currency}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Réf</dt>
                <dd className="font-mono text-xs">{payment.id}</dd>
              </div>
            </dl>

            {(payment.status === "PENDING" || payment.status === "CREATED") && (
              <p className="text-center text-sm text-muted-foreground">
                Tu as <strong>{remainingMin} min</strong> pour finaliser sur Mobile Money.
                <br />
                Cette page se met à jour automatiquement.
              </p>
            )}

            {(payment.status === "FAILED" || payment.status === "EXPIRED") && (
              <div className="grid gap-2">
                <Badge variant="destructive">À réessayer</Badge>
                <Link href="/me/sessions" className="w-full">
                  <Button className="w-full">Retour à mes sessions</Button>
                </Link>
              </div>
            )}

            {payment.status === "SUCCESSFUL" && (
              <p className="text-center font-bold text-[--arena-green]">Redirection…</p>
            )}
          </div>
        )}

        {(!payment || payment.status === "PENDING" || payment.status === "CREATED") && (
          <div className="mt-6 flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline">Annuler le paiement</Button>} />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Annuler le paiement ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ton inscription restera en attente et tu pourras réessayer plus tard.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel render={<Button variant="outline">Garder</Button>} />
                  <AlertDialogAction
                    render={
                      <Button
                        variant="destructive"
                        disabled={cancelling}
                        onClick={async () => {
                          if (payment) {
                            setCancelling(true);
                            const result = await apiPost(`/registrations/${payment.registrationId}/cancel`, {
                              reason: "player-cancelled-payment-status-page",
                            });
                            setCancelling(false);
                            if (!result.ok) {
                              setError(result.error);
                              return;
                            }
                          }
                          router.push("/me/sessions");
                        }}
                      >
                        {cancelling ? "Annulation…" : "Annuler"}
                      </Button>
                    }
                  />
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </main>
  );
}
