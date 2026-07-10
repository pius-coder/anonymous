"use client";

import { useMemo } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { simulateProgram, type EliminationPolicy } from "@session-jeu/game-engine";
import { Button } from "@/components/retroui/button";
import { Badge } from "@/components/retroui/badge";

export type RoundDraft = {
  localId: string;
  miniGame: {
    id: string;
    key: string;
    name: string;
    family: string;
    playerMode: string;
    configSchema: unknown;
    defaultConfig: Record<string, unknown>;
  };
  configJson: Record<string, unknown>;
  durationMs: number;
  policy: EliminationPolicy;
};

const POLICY_LABELS: Record<EliminationPolicy["type"], string> = {
  KEEP_TOP_N: "Les N meilleurs passent",
  ELIMINATE_BOTTOM_N: "Les N derniers sortent",
  ELIMINATE_BOTTOM_PERCENT: "% du bas éliminé",
  DUEL_WINNER_ADVANCES: "Vainqueur de duel avance",
  SURVIVAL_UNTIL_QUOTA: "Survie jusqu'au quota",
  NO_ELIMINATION: "Aucune élimination (points)",
};

function policyLabel(p: EliminationPolicy) {
  switch (p.type) {
    case "KEEP_TOP_N":
      return `Top ${p.n} passent`;
    case "ELIMINATE_BOTTOM_N":
      return `${p.n} derniers éliminés`;
    case "ELIMINATE_BOTTOM_PERCENT":
      return `${p.bps / 100}% éliminés`;
    case "SURVIVAL_UNTIL_QUOTA":
      return `Survie → ${p.quota} restants`;
    default:
      return POLICY_LABELS[p.type];
  }
}

function SortableRoundCard({
  round,
  index,
  onEdit,
  onRemove,
}: {
  round: RoundDraft;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: round.localId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="premium-panel flex items-center gap-3 p-3 transition hover:-translate-y-0.5"
    >
      <button {...attributes} {...listeners} className="grid size-9 cursor-grab place-items-center rounded-xl border border-white/10 bg-black/20 font-head text-white/45 hover:text-white" aria-label="Réordonner">
        ⠿
      </button>
      <span className="font-head text-2xl text-[--arena-pink]">#{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-head">{round.miniGame.name}</p>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="outline">{round.miniGame.family}</Badge>
          <Badge>{policyLabel(round.policy)}</Badge>
          <Badge variant="outline">{Math.round(round.durationMs / 1000)}s</Badge>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onEdit}>
        Config
      </Button>
      <Button size="sm" variant="outline" onClick={onRemove} aria-label="Supprimer">
        ✕
      </Button>
    </div>
  );
}

export function ProgramBuilder({
  rounds,
  setRounds,
  minPlayers,
  maxPlayers,
  winnersCount,
  onAddRound,
  onEditRound,
}: {
  rounds: RoundDraft[];
  setRounds: (r: RoundDraft[]) => void;
  minPlayers: number;
  maxPlayers: number;
  winnersCount: number;
  onAddRound: () => void;
  onEditRound: (localId: string) => void;
}) {
  const policies = rounds.map((r) => r.policy);
  const funnelMax = useMemo(() => simulateProgram(maxPlayers, policies), [maxPlayers, policies]);
  const funnelMin = useMemo(() => simulateProgram(minPlayers, policies), [minPlayers, policies]);
  const finalMax = funnelMax.at(-1) ?? maxPlayers;
  const finalMin = funnelMin.at(-1) ?? minPlayers;
  const coherent = finalMax >= winnersCount && finalMin >= Math.min(winnersCount, minPlayers) && rounds.length > 0;

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = rounds.findIndex((r) => r.localId === e.active.id);
    const to = rounds.findIndex((r) => r.localId === e.over!.id);
    setRounds(arrayMove(rounds, from, to));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-3">
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rounds.map((r) => r.localId)} strategy={verticalListSortingStrategy}>
            {rounds.map((r, i) => (
              <SortableRoundCard
                key={r.localId}
                round={r}
                index={i}
                onEdit={() => onEditRound(r.localId)}
                onRemove={() => setRounds(rounds.filter((x) => x.localId !== r.localId))}
              />
            ))}
          </SortableContext>
        </DndContext>
        <Button onClick={onAddRound} className="w-full">
          + Ajouter un round
        </Button>
      </div>

      <aside className="premium-floating h-fit space-y-4 p-4 lg:sticky lg:top-4">
        <h3 className="font-head text-lg">Funnel d&apos;effectifs</h3>
        {[
          { label: `Session pleine (${maxPlayers})`, steps: funnelMax },
          { label: `Minimum (${minPlayers})`, steps: funnelMin },
        ].map(({ label, steps }) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-head text-lg tracking-tight">
              {steps.map((n: number, i: number) => (
                <span key={i}>
                  <span
                    className={
                      i === steps.length - 1
                        ? n >= winnersCount
                          ? "text-[--arena-green]"
                          : "text-[--arena-danger]"
                        : ""
                    }
                  >
                    {n}
                  </span>
                  {i < steps.length - 1 && <span className="text-muted-foreground"> → </span>}
                </span>
              ))}
            </p>
          </div>
        ))}
        <div className="border-t border-white/10 pt-3">
          <p className="text-xs text-muted-foreground">Gagnants configurés : {winnersCount}</p>
          {coherent ? (
            <Badge className="bg-[--arena-green] text-black">✔ Programme cohérent</Badge>
          ) : (
            <Badge className="bg-[--arena-danger]">✕ Incohérent — publication bloquée</Badge>
          )}
          {!coherent && rounds.length > 0 && (
            <p className="mt-2 text-xs text-[--arena-danger]">
              Le programme doit laisser au moins {winnersCount} joueur(s) à la fin. Ajuste les policies.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
