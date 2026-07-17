"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminSection, AdminStatus, PartyAdminNav } from "@/components/admin/AdminWorkspace";
import { SensitiveActionPanel } from "@/components/admin/SensitiveActionPanel";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelAdminParty,
  createAdminParty,
  getAdminParty,
  publishAdminParty,
  scheduleAdminParty,
  updateAdminPartyConfig,
  validateAdminParty,
} from "@/services/admin/adminPartyClient";
import { MiniGameService } from "@/services/rpcServices";

function randomCode(): string {
  return `P${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

export function PartySetupView({ partyId, mode }: { partyId: string; mode: "create" | "edit" }) {
  const isCreate = mode === "create";
  const router = useRouter();
  const queryClient = useQueryClient();

  const [code, setCode] = useState(randomCode());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("32");
  const [minPlayers, setMinPlayers] = useState("2");
  const [entryFee, setEntryFee] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [minigameId, setMinigameId] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );

  const partyQuery = useQuery({
    queryKey: ["admin", "party", partyId],
    enabled: !isCreate,
    queryFn: async () => {
      const res = await getAdminParty(partyId);
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
  });

  const catalogQuery = useQuery({
    queryKey: ["minigames", "catalog"],
    queryFn: async () => {
      const res = await MiniGameService.list();
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    retry: 0,
  });

  useEffect(() => {
    if (!partyQuery.data) return;
    const p = partyQuery.data;
    setCode(p.code);
    setName(p.name);
    setDescription(p.description ?? "");
    setMaxPlayers(p.maxPlayers != null ? String(p.maxPlayers) : "");
    setMinPlayers(p.minPlayers != null ? String(p.minPlayers) : "2");
    setEntryFee(p.entryFeeAmount != null ? String(p.entryFeeAmount) : "");
    setVisibility(p.visibility === "private" ? "private" : "public");
    if (p.scheduledAt) {
      const d = new Date(p.scheduledAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      setScheduledLocal(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    }
    const program = p.roundProgram as { minigameIds?: string[] } | null;
    if (program?.minigameIds?.[0]) setMinigameId(program.minigameIds[0]);
  }, [partyQuery.data]);

  const catalogGames =
    (catalogQuery.data as { minigames?: Array<{ id: string; name?: string }> } | undefined)
      ?.minigames ??
    (Array.isArray(catalogQuery.data) ? (catalogQuery.data as Array<{ id: string; name?: string }>) : []);

  function buildRoundProgram() {
    if (!minigameId) return undefined;
    return { minigameIds: [minigameId], selectedMinigameIds: [minigameId] };
  }

  function concurrency() {
    return {
      expectedUpdatedAt: partyQuery.data?.updatedAt,
      expectedConfigVersion: partyQuery.data?.configVersion,
    };
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fee = entryFee.trim() === "" ? null : Number(entryFee);
      if (fee != null && Number.isNaN(fee)) throw new Error("Prix d'entrée invalide");
      const minP = minPlayers ? Number(minPlayers) : undefined;
      const maxP = maxPlayers ? Number(maxPlayers) : undefined;
      if (isCreate) {
        const res = await createAdminParty({
          code,
          name,
          visibility,
          minPlayers: minP,
          maxPlayers: maxP,
          description: description || undefined,
          entryFeeAmount: fee,
          entryFeeCurrency: "XAF",
          scheduledAt: scheduledLocal ? new Date(scheduledLocal).toISOString() : undefined,
          roundProgram: buildRoundProgram(),
        });
        if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
        return res.data;
      }
      const res = await updateAdminPartyConfig(partyId, {
        name,
        visibility,
        minPlayers: minP,
        maxPlayers: maxP,
        description,
        entryFeeAmount: fee,
        entryFeeCurrency: "XAF",
        roundProgram: buildRoundProgram(),
        ...concurrency(),
      });
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    onSuccess: (data) => {
      setFeedback({ kind: "success", message: "Configuration enregistrée" });
      void queryClient.invalidateQueries({ queryKey: ["admin", "party"] });
      if (isCreate) router.push(`/admin/parties/${data.id}/setup`);
      else void partyQuery.refetch();
    },
    onError: (e: Error) => setFeedback({ kind: "error", message: e.message }),
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await validateAdminParty(partyId);
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    onSuccess: (data) =>
      setFeedback({
        kind: data.valid ? "success" : "error",
        message: data.valid ? "Configuration valide" : "Configuration invalide",
      }),
    onError: (e: Error) => setFeedback({ kind: "error", message: e.message }),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await publishAdminParty(partyId, concurrency());
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ kind: "success", message: "Partie publiée (SCHEDULED) — aucun lancement auto" });
      void partyQuery.refetch();
    },
    onError: (e: Error) => setFeedback({ kind: "error", message: e.message }),
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!scheduledLocal) throw new Error("Date planifiée requise");
      const res = await scheduleAdminParty(partyId, {
        scheduledAt: new Date(scheduledLocal).toISOString(),
        ...concurrency(),
      });
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ kind: "success", message: "Horaire enregistré (ne démarre pas la partie)" });
      void partyQuery.refetch();
    },
    onError: (e: Error) => setFeedback({ kind: "error", message: e.message }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await cancelAdminParty(partyId, { reason, ...concurrency() });
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ kind: "success", message: "Partie annulée" });
      void partyQuery.refetch();
    },
    onError: (e: Error) => setFeedback({ kind: "error", message: e.message }),
  });

  if (!isCreate && partyQuery.isLoading) {
    return (
      <AppShell audience="Admin" eyebrow="Configuration" title="Chargement…" subtitle="">
        <p className="text-sm text-muted-foreground">Chargement de la partie…</p>
      </AppShell>
    );
  }

  if (!isCreate && partyQuery.isError) {
    return (
      <AppShell audience="Admin" eyebrow="Configuration" title="Erreur" subtitle="">
        <p className="text-sm text-rose-300" role="alert">
          {partyQuery.error instanceof Error ? partyQuery.error.message : "Partie introuvable"}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      audience="Admin"
      eyebrow={isCreate ? "Nouvelle partie" : "Configuration"}
      title={isCreate ? "Créer un brouillon" : name || partyQuery.data?.name || "Partie"}
      subtitle="Configuration, validation et publication. Aucun timer ne lance le live."
      actions={
        <Button
          variant="outline"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name.trim()}
        >
          <Save />
          {isCreate ? "Créer le brouillon" : "Enregistrer"}
        </Button>
      }
    >
      <div className="space-y-4">
        {!isCreate ? <PartyAdminNav partyId={partyId} current="setup" /> : null}
        {feedback ? (
          <p
            className={feedback.kind === "success" ? "text-sm text-emerald-300" : "text-sm text-rose-300"}
            role="status"
          >
            {feedback.message}
          </p>
        ) : null}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
          <AdminSection
            title="Configuration"
            description="Les erreurs restent liées aux champs; aucune action ne lance le live."
          >
            <form
              className="grid gap-4 p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="party-code">Code</Label>
                <Input
                  id="party-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!isCreate}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-visibility">Visibilité</Label>
                <select
                  id="party-visibility"
                  className="h-9 w-full border border-input bg-transparent px-3 text-sm"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                >
                  <option value="public">public</option>
                  <option value="private">private</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="party-name">Nom public</Label>
                <Input
                  id="party-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom de la partie"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-date">Date et heure</Label>
                <Input
                  id="party-date"
                  type="datetime-local"
                  value={scheduledLocal}
                  onChange={(e) => setScheduledLocal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-capacity">Capacité max</Label>
                <Input
                  id="party-capacity"
                  type="number"
                  min={2}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-min">Min joueurs</Label>
                <Input
                  id="party-min"
                  type="number"
                  min={2}
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-price">Prix d’entrée (XAF)</Label>
                <Input
                  id="party-price"
                  type="number"
                  min={0}
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  placeholder="vide = gratuit"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="party-game">Mini-jeu (manifest)</Label>
                {catalogQuery.isError ? (
                  <p className="text-xs text-amber-300">
                    Catalogue indisponible — saisissez un id manifeste connu.
                  </p>
                ) : null}
                {catalogGames.length > 0 ? (
                  <select
                    id="party-game"
                    className="h-9 w-full border border-input bg-transparent px-3 text-sm"
                    value={minigameId}
                    onChange={(e) => setMinigameId(e.target.value)}
                  >
                    <option value="">— sélection —</option>
                    {catalogGames.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name ?? g.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="party-game"
                    value={minigameId}
                    onChange={(e) => setMinigameId(e.target.value)}
                    placeholder="minigame id"
                  />
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="party-description">Description publique</Label>
                <Textarea
                  id="party-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </form>
          </AdminSection>
          <div className="space-y-4">
            <AdminSection title="État">
              <div className="space-y-2 p-4 text-sm">
                <div className="flex items-center gap-2">
                  {partyQuery.data ? (
                    <AdminStatus tone="info">{partyQuery.data.status}</AdminStatus>
                  ) : (
                    <AdminStatus>BROUILLON</AdminStatus>
                  )}
                  {partyQuery.data ? (
                    <span className="text-xs text-muted-foreground">
                      v{partyQuery.data.configVersion} · maj{" "}
                      {new Date(partyQuery.data.updatedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lease requis pour publier / annuler. La sélection multi-manifestes six jeux est
                  composée via P-SEQ-06.
                </p>
              </div>
            </AdminSection>
            {!isCreate ? (
              <>
                <AdminSection title="Actions">
                  <div className="flex flex-wrap gap-2 p-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => validateMutation.mutate()}
                      disabled={validateMutation.isPending}
                    >
                      <CheckCircle2 size={14} />
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => scheduleMutation.mutate()}
                      disabled={scheduleMutation.isPending}
                    >
                      Planifier horaire
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => publishMutation.mutate()}
                      disabled={publishMutation.isPending || partyQuery.data?.status !== "DRAFT"}
                    >
                      Publier
                    </Button>
                    <Button size="sm" variant="outline" render={<Link href={`/admin/parties/${partyId}/control`} />}>
                      Contrôle
                    </Button>
                  </div>
                </AdminSection>
                <SensitiveActionPanel
                  title="Annuler la partie"
                  description="Transition domain Cancelled avec motif d'audit. Lease + version requis."
                  actionLabel="Annuler la partie"
                  consequence="La partie passera à CANCELLED; les joueurs ne pourront plus rejoindre."
                  tone="danger"
                  disabled={cancelMutation.isPending}
                  onConfirm={async (reason) => {
                    await cancelMutation.mutateAsync(reason);
                  }}
                />
              </>
            ) : (
              <AdminSection title="Après création">
                <p className="p-4 text-xs text-muted-foreground flex gap-2">
                  <CircleAlert size={14} />
                  Enregistrez le brouillon, acquérez le lease, puis publiez depuis setup.
                </p>
              </AdminSection>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
