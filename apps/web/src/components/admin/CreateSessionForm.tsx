"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/retroui/alert";
import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Input } from "@/components/retroui/input";
import { NativeSelect, NativeSelectOption } from "@/components/retroui/native-select";
import { Textarea } from "@/components/retroui/textarea";
import type { AdminSession, MiniGameDefinition } from "@/services/admin/types";

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

const FAMILY_ORDER = ["SOLO", "DUEL", "ALLIANCE", "TEAM", "SURVIVAL", "HIDDEN_ROLE"];

function groupMiniGames(miniGames: MiniGameDefinition[]) {
  const groups = new Map<string, MiniGameDefinition[]>();
  for (const game of miniGames) {
    groups.set(game.family, [...(groups.get(game.family) ?? []), game]);
  }
  return FAMILY_ORDER.map((family) => ({ family, games: groups.get(family) ?? [] })).filter(
    (group) => group.games.length > 0,
  );
}

export function CreateSessionForm({ miniGames }: { miniGames: MiniGameDefinition[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const miniGameGroups = groupMiniGames(miniGames);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      code: String(form.get("code") || "").trim().toUpperCase() || undefined,
      name: String(form.get("name") || ""),
      description: String(form.get("description") || "") || undefined,
      minPlayers: Number(form.get("minPlayers") || 2),
      maxPlayers: Number(form.get("maxPlayers") || 10),
      entryFeeXaf: Number(form.get("entryFeeXaf") || 100),
      visibility: String(form.get("visibility") || "PRIVATE"),
      prizePoolBps: Number(form.get("prizePoolBps") || 6000),
      providerFeeBps: Number(form.get("providerFeeBps") || 300),
      winnerSplitBps: [10000],
      startsAt: toIso(String(form.get("startsAt") || "")),
      registrationClosesAt: toIso(String(form.get("registrationClosesAt") || "")),
      reason: String(form.get("reason") || "") || "Creation console admin",
    };

    const result = await apiPost<{ session: AdminSession }>("/admin/sessions", payload);
    setSaving(false);

    if (!result.ok) {
      setError(`${result.error.code}: ${result.error.message}`);
      return;
    }

    router.push(`/admin/sessions/${result.data.session.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Configuration generale</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && (
            <Alert status="error">
              <AlertTitle>Creation refusee</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Nom
              <Input name="name" required minLength={3} maxLength={120} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Code public
              <Input name="code" minLength={3} maxLength={64} pattern="[A-Za-z0-9-]+" />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-medium">
            Description
            <Textarea name="description" maxLength={1000} />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium">
              Min joueurs
              <Input name="minPlayers" type="number" min={2} defaultValue={2} required />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Max joueurs
              <Input name="maxPlayers" type="number" min={2} defaultValue={10} required />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Acces
              <NativeSelect name="visibility" className="w-full">
                <NativeSelectOption value="PRIVATE">PRIVATE</NativeSelectOption>
                <NativeSelectOption value="UNLISTED">UNLISTED</NativeSelectOption>
                <NativeSelectOption value="PUBLIC">PUBLIC</NativeSelectOption>
              </NativeSelect>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium">
              Prix XAF
              <Input name="entryFeeXaf" type="number" min={100} defaultValue={1000} required />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Enveloppe bps
              <Input name="prizePoolBps" type="number" min={0} max={10000} defaultValue={6000} required />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Frais provider bps
              <Input name="providerFeeBps" type="number" min={0} max={10000} defaultValue={300} required />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Debut
              <Input name="startsAt" type="datetime-local" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Fin inscriptions
              <Input name="registrationClosesAt" type="datetime-local" />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-medium">
            Raison
            <Textarea name="reason" maxLength={500} defaultValue="Creation console admin" />
          </label>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-head text-lg uppercase">Mini-jeux actifs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {miniGames.length === 0 ? (
              <p className="text-muted-foreground">Aucun mini-jeu actif.</p>
            ) : (
              miniGameGroups.map((group) => (
                <div key={group.family} className="border-b-2 border-border pb-3 last:border-b-0 last:pb-0">
                  <p className="font-head text-sm uppercase">
                    {group.family} · {group.games.length}/6
                  </p>
                  <div className="mt-2 space-y-2">
                    {group.games.map((game) => (
                      <div key={game.id}>
                        <p className="font-medium">{game.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {game.playerMode} · v{game.version}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Creation..." : "Creer la session"}
        </Button>
      </div>
    </form>
  );
}
