"use client";

import { useState, useMemo } from "react";
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

type FieldErrors = Record<string, string[]>;

function parseFieldErrors(error: unknown): { message: string; fields: FieldErrors } {
  const err = error as { code?: string; message?: string; details?: Record<string, string[]> };
  if (err?.details && typeof err.details === "object") {
    return { message: err.message ?? "Erreur de validation", fields: err.details as FieldErrors };
  }
  return { message: err?.message ?? "Erreur inconnue", fields: {} };
}

export function CreateSessionForm({ miniGames }: { miniGames: MiniGameDefinition[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const miniGameGroups = useMemo(() => groupMiniGames(miniGames), [miniGames]);

  const [formValues, setFormValues] = useState({
    entryFeeXaf: 1000,
    minPlayers: 2,
    maxPlayers: 10,
    prizePoolBps: 6000,
    providerFeeBps: 300,
    winnerSplitBps: "10000",
  });

  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);

  function toggleGame(id: string) {
    setSelectedGameIds((prev) => {
      if (prev.includes(id)) return prev.filter((gid) => gid !== id);
      return [...prev, id];
    });
  }

  function moveGameUp(index: number) {
    if (index <= 0) return;
    setSelectedGameIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveGameDown(index: number) {
    setSelectedGameIds((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  const financials = useMemo(() => {
    const maxPlayers = formValues.maxPlayers;
    const entryFeeXaf = formValues.entryFeeXaf;
    const providerFeeBps = formValues.providerFeeBps;
    const prizePoolBps = formValues.prizePoolBps;
    const winnerSplitBps = formValues.winnerSplitBps.split(",").map(Number).filter((n) => n > 0);
    const totalSplit = winnerSplitBps.reduce((a, b) => a + b, 0);

    const grossPerPlayer = entryFeeXaf;
    const grossTotal = maxPlayers * grossPerPlayer;
    const estimatedFees = Math.floor((grossTotal * providerFeeBps) / 10000);
    const netTotal = grossTotal - estimatedFees;
    const prizePoolXaf = Math.floor((netTotal * prizePoolBps) / 10000);
    const orgCommission = netTotal - prizePoolXaf;
    const winnerShares = winnerSplitBps.map((split) =>
      Math.floor((prizePoolXaf * split) / 10000),
    );

    return { grossTotal, estimatedFees, netTotal, prizePoolXaf, orgCommission, winnerShares, totalSplit };
  }, [formValues]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaving(true);

    const form = new FormData(event.currentTarget);
    const winnerSplitRaw = String(form.get("winnerSplitBps") || "10000");
    const winnerSplitBps = winnerSplitRaw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => n > 0);

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
      winnerSplitBps,
      selectedMiniGameIds: selectedGameIds.length > 0 ? selectedGameIds : undefined,
      startsAt: toIso(String(form.get("startsAt") || "")),
      registrationClosesAt: toIso(String(form.get("registrationClosesAt") || "")),
      reason: String(form.get("reason") || "") || "Creation console admin",
    };

    const result = await apiPost<{ session: AdminSession }>("/admin/sessions", payload);
    setSaving(false);

    if (!result.ok) {
      const parsed = parseFieldErrors(result.error);
      setError(parsed.message);
      setFieldErrors(parsed.fields);
      return;
    }

    router.push(`/admin/sessions/${result.data.session.id}`);
    router.refresh();
  }

  function renderFieldError(field: string) {
    const msgs = fieldErrors[field];
    if (!msgs?.length) return null;
    return <p className="mt-1 text-xs font-bold text-[--arena-danger]">{msgs.join(", ")}</p>;
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
              {renderFieldError("name")}
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Code public <span className="text-[10px] text-muted-foreground">(optionnel)</span>
              <Input name="code" minLength={3} maxLength={64} pattern="[A-Z0-9-]+" />
              {renderFieldError("code")}
            </label>
          </div>

          <label className="grid gap-1 text-sm font-medium">
            Description <span className="text-[10px] text-muted-foreground">(optionnel)</span>
            <Textarea name="description" maxLength={1000} />
            {renderFieldError("description")}
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium">
              Min joueurs
              <Input
                name="minPlayers"
                type="number"
                min={2}
                defaultValue={2}
                required
                onChange={(e) => setFormValues((v) => ({ ...v, minPlayers: Number(e.target.value) }))}
              />
              {renderFieldError("minPlayers")}
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Max joueurs
              <Input
                name="maxPlayers"
                type="number"
                min={2}
                defaultValue={10}
                required
                onChange={(e) => setFormValues((v) => ({ ...v, maxPlayers: Number(e.target.value) }))}
              />
              {renderFieldError("maxPlayers")}
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Accès
              <NativeSelect name="visibility" className="w-full">
                <NativeSelectOption value="PRIVATE">PRIVATE</NativeSelectOption>
                <NativeSelectOption value="UNLISTED">UNLISTED</NativeSelectOption>
                <NativeSelectOption value="PUBLIC">PUBLIC</NativeSelectOption>
              </NativeSelect>
              {renderFieldError("visibility")}
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium">
              Prix XAF
              <Input
                name="entryFeeXaf"
                type="number"
                min={100}
                defaultValue={1000}
                required
                onChange={(e) => setFormValues((v) => ({ ...v, entryFeeXaf: Number(e.target.value) }))}
              />
              {renderFieldError("entryFeeXaf")}
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Enveloppe bps
              <Input
                name="prizePoolBps"
                type="number"
                min={0}
                max={10000}
                defaultValue={6000}
                required
                onChange={(e) => setFormValues((v) => ({ ...v, prizePoolBps: Number(e.target.value) }))}
              />
              {renderFieldError("prizePoolBps")}
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Frais provider bps
              <Input
                name="providerFeeBps"
                type="number"
                min={0}
                max={10000}
                defaultValue={300}
                required
                onChange={(e) => setFormValues((v) => ({ ...v, providerFeeBps: Number(e.target.value) }))}
              />
              {renderFieldError("providerFeeBps")}
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Debut (UTC) <span className="text-[10px] text-muted-foreground">(optionnel)</span>
              <Input name="startsAt" type="datetime-local" />
              {renderFieldError("startsAt")}
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Fin inscriptions (UTC) <span className="text-[10px] text-muted-foreground">(optionnel)</span>
              <Input name="registrationClosesAt" type="datetime-local" />
              {renderFieldError("registrationClosesAt")}
            </label>
          </div>

          <label className="grid gap-1 text-sm font-medium">
            Répartition prize (bps, virgule) <span className="text-[10px] text-muted-foreground">(ex: 10000 ou 5000,3000,2000)</span>
            <Input
              name="winnerSplitBps"
              defaultValue="10000"
              onChange={(e) => setFormValues((v) => ({ ...v, winnerSplitBps: e.target.value }))}
            />
            {renderFieldError("winnerSplitBps")}
            <p className="text-[10px] text-muted-foreground">
              Somme: {financials.totalSplit} bps{financials.totalSplit !== 10000 && ` — doit totaliser 10000`}
            </p>
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Raison <span className="text-[10px] text-muted-foreground">(optionnel, audit log)</span>
            <Textarea name="reason" maxLength={500} defaultValue="Creation console admin" />
            {renderFieldError("reason")}
          </label>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-head text-lg uppercase">Aperçu financier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Brut ({formValues.maxPlayers} × {formValues.entryFeeXaf} XAF)</span><span className="font-mono">{financials.grossTotal.toLocaleString()} XAF</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Frais ({formValues.providerFeeBps} bps)</span><span className="font-mono">−{financials.estimatedFees.toLocaleString()} XAF</span></div>
            <div className="flex justify-between font-bold border-t-2 border-border pt-2"><span>Net</span><span className="font-mono">{financials.netTotal.toLocaleString()} XAF</span></div>
            <div className="flex justify-between text-[--arena-green]"><span>Prize pool ({formValues.prizePoolBps} bps)</span><span className="font-mono">{financials.prizePoolXaf.toLocaleString()} XAF</span></div>
            <div className="flex justify-between"><span>Commission organisme</span><span className="font-mono">{financials.orgCommission.toLocaleString()} XAF</span></div>
            {financials.winnerShares.length > 0 && (
              <div className="border-t-2 border-border pt-2 text-xs text-muted-foreground">
                <p>Gagnants: {financials.winnerShares.map((s, i) => `${i + 1}er: ${s.toLocaleString()} XAF`).join(", ")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-head text-lg uppercase">Selection des mini-jeux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {miniGames.length === 0 ? (
              <p className="text-muted-foreground">Aucun mini-jeu actif.</p>
            ) : (
              <>
                {selectedGameIds.length > 0 && (
                  <div className="mb-3 rounded-lg border-2 border-[--arena-green] p-3">
                    <p className="font-head text-xs uppercase tracking-wider text-[--arena-green]">Selectionnes ({selectedGameIds.length})</p>
                    <ol className="mt-2 space-y-1">
                      {selectedGameIds.map((id, index) => {
                        const game = miniGames.find((g) => g.id === id);
                        if (!game) return null;
                        return (
                          <li key={id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium">{index + 1}. {game.name}</span>
                            <span className="flex gap-1">
                              <button type="button" onClick={() => moveGameUp(index)} className="text-muted-foreground hover:text-foreground" disabled={index === 0}>↑</button>
                              <button type="button" onClick={() => moveGameDown(index)} className="text-muted-foreground hover:text-foreground" disabled={index === selectedGameIds.length - 1}>↓</button>
                              <button type="button" onClick={() => toggleGame(id)} className="text-[--arena-danger] hover:text-red-400">✕</button>
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
                {miniGameGroups.map((group) => (
                  <div key={group.family} className="border-b-2 border-border pb-3 last:border-b-0 last:pb-0">
                    <p className="font-head text-sm uppercase">
                      {group.family} · {group.games.length} jeux
                    </p>
                    <div className="mt-2 space-y-2">
                      {group.games.map((game) => {
                        const isSelected = selectedGameIds.includes(game.id);
                        return (
                          <label key={game.id} className={`flex cursor-pointer items-start gap-2 rounded-md p-2 transition-colors ${isSelected ? "bg-accent" : "hover:bg-muted/50"}`}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleGame(game.id)} className="mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium">{game.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {game.playerMode} · v{game.version}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="mt-0.5 text-[10px] text-[--arena-green]">
                                #{selectedGameIds.indexOf(game.id) + 1}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
            <p className="text-[10px] text-muted-foreground">Les mini-jeux sont jou&eacute;s dans l&apos;ordre s&eacute;lectionn&eacute;. Par d&eacute;faut (aucun), la rotation standard est utilis&eacute;e.</p>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Creation..." : "Creer la session"}
        </Button>
      </div>
    </form>
  );
}
