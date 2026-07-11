"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch } from "@/lib/api";
import { translateError } from "@/lib/errors.fr";
import { Alert, AlertDescription, AlertTitle } from "@/components/retroui/alert";
import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { NativeSelect, NativeSelectOption } from "@/components/retroui/native-select";
import { Textarea } from "@/components/retroui/textarea";
import { Label } from "@/components/retroui/label";
import type { AdminSession } from "@/services/admin/types";

export function AdminVisibilityControl({ session }: { session: AdminSession }) {
  const router = useRouter();
  const [visibility, setVisibility] = useState(session.visibility);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const result = await apiPatch(`/admin/sessions/${session.id}`, {
      expectedConfigVersion: session.configVersion,
      visibility: String(form.get("visibility")),
      reason: String(form.get("reason") || ""),
    });

    setBusy(false);
    if (!result.ok) {
      setMessage({ type: "error", text: translateError(result.error.code, result.error.status) });
      return;
    }
    setMessage({ type: "success", text: "Visibilité mise à jour" });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-lg uppercase">Visibilité</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <Label htmlFor="session-visibility">Acces a la session</Label>
          <NativeSelect
            id="session-visibility"
            name="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="PUBLIC">Publique — catalogue</NativeSelectOption>
            <NativeSelectOption value="UNLISTED">
              Lien direct — absente du catalogue
            </NativeSelectOption>
            <NativeSelectOption value="PRIVATE">Privée — invitation requise</NativeSelectOption>
          </NativeSelect>
          <Label htmlFor="session-visibility-reason">Raison du changement</Label>
          <Textarea
            id="session-visibility-reason"
            name="reason"
            required
            minLength={3}
            maxLength={500}
            placeholder="Raison du changement"
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Mise à jour..." : "Modifier la visibilité"}
          </Button>
          {message && (
            <Alert
              variant={message.type === "error" ? "destructive" : "default"}
              aria-live="polite"
            >
              <AlertTitle>
                {message.type === "error" ? "Modification refusée" : "Modification enregistrée"}
              </AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
