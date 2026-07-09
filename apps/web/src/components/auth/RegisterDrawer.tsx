"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/retroui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/retroui/dialog";
import { Button } from "@/components/retroui/button";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/retroui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/retroui/radio-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/retroui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/retroui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiGet, apiPost, type ApiError } from "@/lib/api";
import { translateError } from "@/lib/errors.fr";
export type RegisterSessionInput = {
  id: string;
  code: string;
  title: string;
  entryFeeXaf: number;
};

type Wallet = { balanceXaf: number; currency: string; isFrozen: boolean };

const xafNf = new Intl.NumberFormat("fr-FR");

function formatXaf(amount: number, currency: string) {
  return xafNf.format(amount) + " " + currency;
}

export function RegisterDrawer({
  session,
  open,
  onOpenChange,
  trigger,
  onRegistered,
}: {
  session: RegisterSessionInput;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  onRegistered?: () => void;
}) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<"fapshi" | "wallet">("wallet");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const walletSufficient = !!wallet && wallet.balanceXaf >= session.entryFeeXaf && !wallet.isFrozen;

  const resetForOpen = () => {
    setError(null);
    setStep(0);
    setDone(false);
    void apiGet<{ wallet: Wallet }>("/wallet/me").then((r) => {
      if (r.ok) setWallet(r.data.wallet);
    });
  };

  const startRegister = async (): Promise<{ id: string; status: string } | ApiError | null> => {
    const reg = await apiPost<{ registration: { id: string; status: string } }>(
      `/sessions/${session.id}/register`,
    );
    if (!reg.ok) {
      setError(reg.error);
      return reg.error;
    }
    return reg.data.registration;
  };

  const payWithWallet = async (registrationId: string) => {
    const res = await apiPost<{ payment: { id: string; status: string } }>(
      `/registrations/${registrationId}/pay-with-wallet`,
      { idempotencyKey },
    );
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    setPending(true);
    setError(null);
    const reg = await startRegister();
    if (!reg || "code" in reg) {
      setPending(false);
      return;
    }
    const registration = reg;
    if (registration.status === "PAID") {
      setDone(true);
      setPending(false);
      onRegistered?.();
      return;
    }
    if (method === "wallet") {
      const ok = await payWithWallet(registration.id);
      setPending(false);
      if (ok) {
        setDone(true);
        onRegistered?.();
      }
      return;
    }
    const pay = await apiPost<{ payment: { id: string }; checkoutUrl: string }>(
      "/payments/fapshi/initiate",
      { registrationId: registration.id, redirectUrl: `${window.location.origin}/payments/${registration.id}/status` },
    );
    setPending(false);
    if (!pay.ok) {
      setError(pay.error);
      return;
    }
    if (pay.data.checkoutUrl) {
      window.location.href = pay.data.checkoutUrl;
      return;
    }
    router.push(`/payments/${pay.data.payment.id}/status`);
  };

  const body = (
    <div className="grid gap-5">
      <Progress value={step} max={2}>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>

      {error && (
        <Alert variant="destructive" aria-live="assertive">
          <AlertTitle>Inscription impossible</AlertTitle>
          <AlertDescription>{translateError(error.code, error.status)}</AlertDescription>
        </Alert>
      )}

      {done ? (
        <div className="grid gap-3 text-center">
          <p className="font-head text-2xl font-black uppercase text-[--arena-green]">Inscrit !</p>
          <p className="text-sm text-muted-foreground">
            Tu es inscrit à <strong>{session.title}</strong>. Pense à te signaler (check-in) avant le début.
          </p>
          <Button
            onClick={() => {
              onRegistered?.();
              router.push(`/session/${session.code}`);
            }}
          >
            Voir la session
          </Button>
        </div>
      ) : (
        <>
          {step === 0 && (
            <div className="grid gap-3">
              <h3 className="font-head text-lg font-black uppercase">Récapitulatif</h3>
              <dl className="grid gap-1 text-sm">
                <div className="flex justify-between border-b-2 border-border pb-1">
                  <dt className="text-muted-foreground">Session</dt>
                  <dd className="font-bold">{session.title}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Frais d&apos;entrée</dt>
                  <dd className="font-bold">{formatXaf(session.entryFeeXaf, wallet?.currency ?? "XAF")}</dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                En t&apos;inscrivant, tu acceptes le règlement de la session. Le paiement sécurise ta place.
              </p>
              <Button onClick={() => setStep(1)} className="w-full" size="lg">
                Continuer
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3">
              <h3 className="font-head text-lg font-black uppercase">Paiement</h3>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as "fapshi" | "wallet")} className="grid gap-3">
                <label
                  className={`flex cursor-pointer items-center gap-3 border-2 border-border bg-card p-3 shadow-sm ${
                    method === "wallet" ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <RadioGroupItem value="wallet" />
                  <div className="flex-1">
                    <p className="font-head font-bold uppercase">Portefeuille</p>
                    <p className="text-sm text-muted-foreground">
                      Solde : {wallet ? formatXaf(wallet.balanceXaf, wallet.currency) : "…"}
                    </p>
                  </div>
                  {!walletSufficient && (
                    <Tooltip>
                      <TooltipTrigger render={<span className="text-xs font-bold text-[--arena-danger]">Insuffisant</span>} />
                      <TooltipContent>Solde insuffisant ou portefeuille gelé.</TooltipContent>
                    </Tooltip>
                  )}
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-3 border-2 border-border bg-card p-3 shadow-sm ${
                    method === "fapshi" ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <RadioGroupItem value="fapshi" />
                  <div className="flex-1">
                    <p className="font-head font-bold uppercase">Mobile Money (Fapshi)</p>
                    <p className="text-sm text-muted-foreground">Paiement par Mobile Money.</p>
                  </div>
                </label>
              </RadioGroup>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  className="flex-1"
                  disabled={method === "wallet" && !walletSufficient}
                >
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3">
              <h3 className="font-head text-lg font-black uppercase">Confirmation</h3>
              <p className="text-sm text-muted-foreground">
                Méthode : <strong>{method === "wallet" ? "Portefeuille" : "Mobile Money (Fapshi)"}</strong>
                <br />
                Montant : <strong>{formatXaf(session.entryFeeXaf, wallet?.currency ?? "XAF")}</strong>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1" disabled={pending}>
                  Retour
                </Button>
                <Button onClick={handleConfirm} className="flex-1" disabled={pending} size="lg">
                  {pending ? "Traitement…" : "Confirmer l'inscription"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const handleOpenChange = (next: boolean) => {
    if (next) resetForOpen();
    onOpenChange?.(next);
  };

  const shell = (children: React.ReactNode) => (
    <>
      {trigger && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            resetForOpen();
            onOpenChange?.(true);
          }}
        >
          {trigger}
        </span>
      )}
      {isMobile ? (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="font-head text-2xl font-black uppercase">S&apos;inscrire</DrawerTitle>
              <DrawerDescription>Session {session.code}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">{children}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-head text-2xl font-black uppercase">S&apos;inscrire</DialogTitle>
              <DialogDescription>Session {session.code}</DialogDescription>
            </DialogHeader>
            {children}
          </DialogContent>
        </Dialog>
      )}
    </>
  );

  return shell(body);
}
