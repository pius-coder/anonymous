"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { randomNonce } from "@/lib/nonce";
import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Input } from "@/components/retroui/input";
import { NativeSelect, NativeSelectOption } from "@/components/retroui/native-select";
import { Textarea } from "@/components/retroui/textarea";
import type { AdminSession, MiniGameDefinition } from "@/app/admin/admin-types";

function useAdminAction() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(path: string, body?: unknown, success = "Action executee") {
    setBusy(true);
    setMessage(null);
    const result = await apiPost(path, body);
    setBusy(false);
    if (!result.ok) {
      setMessage(`${result.error.code}: ${result.error.message}`);
      return false;
    }
    setMessage(success);
    router.refresh();
    return true;
  }

  return { busy, message, run };
}

function ReasonBox({
  name = "reason",
  placeholder = "Raison obligatoire",
}: {
  name?: string;
  placeholder?: string;
}) {
  return <Textarea name={name} required minLength={3} maxLength={500} placeholder={placeholder} />;
}

export function SessionLifecycleActions({ session }: { session: AdminSession }) {
  const { busy, message, run } = useAdminAction();

  async function submit(event: React.FormEvent<HTMLFormElement>, action: "publish" | "open-registration" | "cancel") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(`/admin/sessions/${session.id}/${action}`, {
      expectedConfigVersion: session.configVersion,
      reason: String(form.get("reason") || ""),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-lg uppercase">Cycle de vie</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        {(["publish", "open-registration", "cancel"] as const).map((action) => (
          <form key={action} onSubmit={(event) => submit(event, action)} className="space-y-2">
            <ReasonBox />
            <Button
              type="submit"
              variant={action === "cancel" ? "destructive" : "outline"}
              disabled={busy}
              className="w-full"
            >
              {action === "publish" ? "Publier" : action === "open-registration" ? "Ouvrir inscriptions" : "Annuler"}
            </Button>
          </form>
        ))}
        {message && <p className="lg:col-span-3 text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}

export function LiveControlActions({ sessionId }: { sessionId: string }) {
  const { busy, message, run } = useAdminAction();

  async function pause(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(`/admin/live/${sessionId}/pause`, { reason: String(form.get("reason") || "") });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-lg uppercase">Controle live</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(`/admin/sessions/${sessionId}/start`, undefined, "Demarrage demande");
          }}
          className="space-y-2"
        >
          <Button type="submit" variant="outline" disabled={busy} className="w-full">
            Demarrer
          </Button>
        </form>
        <form onSubmit={pause} className="space-y-2">
          <ReasonBox />
          <Button type="submit" variant="outline" disabled={busy} className="w-full">
            Pause
          </Button>
        </form>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(`/admin/live/${sessionId}/resume`, undefined, "Reprise demandee");
          }}
          className="space-y-2"
        >
          <Button type="submit" variant="outline" disabled={busy} className="w-full">
            Reprendre
          </Button>
        </form>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void run(`/admin/sessions/${sessionId}/finalize`, {
              tiePolicy: "USER_ID_ASC",
              reason: String(form.get("reason") || ""),
            });
          }}
          className="space-y-2 md:col-span-3"
        >
          <ReasonBox />
          <Button type="submit" disabled={busy}>
            Finaliser
          </Button>
        </form>
        {message && <p className="md:col-span-3 text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}

export function PaymentReconcileForm({ paymentId }: { paymentId: string }) {
  const { busy, message, run } = useAdminAction();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(`/admin/payments/${paymentId}/reconcile`, { reason: String(form.get("reason") || "") });
      }}
      className="flex min-w-80 items-end gap-2"
    >
      <Input name="reason" required minLength={3} maxLength={500} placeholder="Raison" />
      <Button type="submit" size="sm" disabled={busy}>
        Reconcile
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </form>
  );
}

export function WalletAdjustForm({ defaultUserId = "" }: { defaultUserId?: string }) {
  const { busy, message, run } = useAdminAction();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const userId = String(form.get("userId") || "");
        void run(`/admin/wallets/${userId}/adjust`, {
          amountXaf: Number(form.get("amountXaf") || 0),
          direction: String(form.get("direction") || "CREDIT"),
          type: String(form.get("type") || "ADJUSTMENT"),
          reason: String(form.get("reason") || ""),
          idempotencyKey: randomNonce("admin"),
        });
      }}
      className="grid gap-3 md:grid-cols-[1fr_140px_150px_150px] md:items-end"
    >
      <label className="grid gap-1 text-sm font-medium">
        User ID
        <Input name="userId" required defaultValue={defaultUserId} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Montant
        <Input name="amountXaf" type="number" min={1} required />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Direction
        <NativeSelect name="direction" className="w-full">
          <NativeSelectOption value="CREDIT">CREDIT</NativeSelectOption>
          <NativeSelectOption value="DEBIT">DEBIT</NativeSelectOption>
        </NativeSelect>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Type
        <NativeSelect name="type" className="w-full">
          <NativeSelectOption value="ADJUSTMENT">ADJUSTMENT</NativeSelectOption>
          <NativeSelectOption value="BONUS">BONUS</NativeSelectOption>
          <NativeSelectOption value="REFUND">REFUND</NativeSelectOption>
        </NativeSelect>
      </label>
      <label className="grid gap-1 text-sm font-medium md:col-span-3">
        Raison
        <ReasonBox />
      </label>
      <div>
        <Button type="submit" disabled={busy} className="w-full">
          Ajuster
        </Button>
      </div>
      {message && <p className="text-sm text-muted-foreground md:col-span-4">{message}</p>}
    </form>
  );
}

export function MiniGameToggleForm({ game }: { game: MiniGameDefinition }) {
  const { busy, message, run } = useAdminAction();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void run(`/admin/minigames/${game.id}/enable`, { enabled: !game.enabled });
      }}
      className="flex items-center gap-2"
    >
      <Button type="submit" size="sm" variant="outline" disabled={busy}>
        {game.enabled ? "Desactiver" : "Activer"}
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </form>
  );
}

export function SupportCaseForm({ userId }: { userId: string }) {
  const { busy, message, run } = useAdminAction();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(`/admin/support/users/${userId}/cases`, {
          subject: String(form.get("subject") || ""),
          description: String(form.get("description") || ""),
          reason: String(form.get("reason") || ""),
        });
      }}
      className="grid gap-3"
    >
      <Input name="subject" required minLength={3} maxLength={160} placeholder="Sujet" />
      <Textarea name="description" maxLength={1000} placeholder="Description" />
      <ReasonBox />
      <Button type="submit" disabled={busy}>
        Creer le cas
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </form>
  );
}
