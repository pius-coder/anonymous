"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Flag, Pause, Play, Rocket, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RoundService } from "@/services/round/RoundService";

type AdminRoundStatus = "setup" | "briefing" | "active" | "suspended" | "verification" | "closed";

const configureRoundSchema = z.object({
  roundNumber: z.coerce.number().int().min(1).max(99),
  minigameId: z.string().min(2).max(120),
  durationSeconds: z.coerce.number().int().min(15).max(86_400),
  auditReason: z.string().trim().max(500).optional(),
});

export type ConfigureRoundInput = z.infer<typeof configureRoundSchema>;
type ConfigureRoundFormValues = z.input<typeof configureRoundSchema>;

type AdminRoundControlsProps = {
  partyId: string;
  roundId?: string;
  status: AdminRoundStatus;
  defaultValues?: Partial<ConfigureRoundInput>;
  lateInputs?: number;
  duplicateInputs?: number;
  onConfigure?: (input: ConfigureRoundInput) => Promise<void> | void;
  onStartBriefing?: () => Promise<void> | void;
  onActivateRound?: () => Promise<void> | void;
  onPauseRound?: () => Promise<void> | void;
  onResumeRound?: () => Promise<void> | void;
  onCloseRound?: () => Promise<void> | void;
};

export function AdminRoundControls({
  partyId,
  roundId,
  status,
  defaultValues,
  lateInputs = 0,
  duplicateInputs = 0,
  onConfigure,
  onStartBriefing,
  onActivateRound,
  onPauseRound,
  onResumeRound,
  onCloseRound,
}: AdminRoundControlsProps) {
  const [currentRoundId, setCurrentRoundId] = useState(roundId);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfigureRoundFormValues, unknown, ConfigureRoundInput>({
    resolver: zodResolver(configureRoundSchema),
    defaultValues: {
      roundNumber: defaultValues?.roundNumber ?? 1,
      minigameId: defaultValues?.minigameId ?? "pilot-memory-sequence",
      durationSeconds: defaultValues?.durationSeconds ?? 180,
      auditReason: defaultValues?.auditReason ?? "Configuration sprint 10",
    },
  });

  const busy = isSubmitting || Boolean(pendingCommand);
  const canConfigure = currentStatus === "setup";
  const canStartBriefing = currentStatus === "setup" && Boolean(currentRoundId);
  const canActivate = currentStatus === "briefing";
  const canPause = currentStatus === "active";
  const canResume = currentStatus === "suspended";
  const canClose = currentStatus === "active" || currentStatus === "suspended";

  async function submitConfigure(input: ConfigureRoundInput) {
    setFeedback(null);
    setPendingCommand("configure");
    try {
      if (onConfigure) {
        await onConfigure(input);
      } else {
        const response = await RoundService.configure(partyId, input);
        if (!response.success) throw new Error(`${response.error.code}: ${response.error.message}`);
        setCurrentRoundId(response.data.roundId);
        setCurrentStatus(statusFromApi(response.data.status));
      }
      setFeedback({ kind: "success", message: "Configuration confirmee" });
    } catch (err) {
      setFeedback({ kind: "error", message: err instanceof Error ? err.message : "Commande refusee" });
    } finally {
      setPendingCommand(null);
    }
  }

  async function runRoundCommand(
    command: string,
    callback: (() => Promise<void> | void) | undefined,
    fallback: (roundId: string) => Promise<Awaited<ReturnType<typeof RoundService.startBriefing>>>,
  ) {
    if (!currentRoundId) return;
    setFeedback(null);
    setPendingCommand(command);
    try {
      if (callback) {
        await callback();
      } else {
        const response = await fallback(currentRoundId);
        if (!response.success) throw new Error(`${response.error.code}: ${response.error.message}`);
        setCurrentStatus(statusFromApi(response.data.status));
      }
      setFeedback({ kind: "success", message: `${command} confirmee` });
    } catch (err) {
      setFeedback({ kind: "error", message: err instanceof Error ? err.message : "Commande refusee" });
    } finally {
      setPendingCommand(null);
    }
  }

  return (
    <section className="admin-round" aria-labelledby="admin-round-title">
      <div className="panel-heading">
        <div>
          <p className="label">Party {partyId}</p>
          <h2 id="admin-round-title">Round control</h2>
        </div>
        <span className="phase-token">{currentStatus.toUpperCase()}</span>
      </div>

      <form className="round-config-form" onSubmit={handleSubmit(submitConfigure)}>
        <label>
          Round
          <input inputMode="numeric" {...register("roundNumber")} disabled={!canConfigure || busy} aria-invalid={Boolean(errors.roundNumber)} aria-describedby={errors.roundNumber ? "roundNumber-error" : undefined} />
          {errors.roundNumber ? <span id="roundNumber-error" role="alert">{errors.roundNumber.message}</span> : null}
        </label>
        <label>
          Mini-jeu
          <input {...register("minigameId")} disabled={!canConfigure || busy} aria-invalid={Boolean(errors.minigameId)} aria-describedby={errors.minigameId ? "minigameId-error" : undefined} />
          {errors.minigameId ? <span id="minigameId-error" role="alert">{errors.minigameId.message}</span> : null}
        </label>
        <label>
          Duree secondes
          <input inputMode="numeric" {...register("durationSeconds")} disabled={!canConfigure || busy} aria-invalid={Boolean(errors.durationSeconds)} aria-describedby={errors.durationSeconds ? "durationSeconds-error" : undefined} />
          {errors.durationSeconds ? <span id="durationSeconds-error" role="alert">{errors.durationSeconds.message}</span> : null}
        </label>
        <label className="form-wide">
          Raison audit
          <input {...register("auditReason")} disabled={busy} aria-invalid={Boolean(errors.auditReason)} aria-describedby={errors.auditReason ? "auditReason-error" : undefined} />
          {errors.auditReason ? <span id="auditReason-error" role="alert">{errors.auditReason.message}</span> : null}
        </label>
        <button className="command-button command-button--secondary" type="submit" disabled={!canConfigure || busy}>
          <ClipboardList aria-hidden="true" size={18} />
          Configurer
        </button>
      </form>

      <div className="command-rail" aria-label="Commandes round admin">
        <button className="command-button" type="button" disabled={!canStartBriefing || busy} onClick={() => runRoundCommand("Briefing", onStartBriefing, RoundService.startBriefing)}>
          <Rocket aria-hidden="true" size={18} />
          Lancer briefing
        </button>
        <button className="command-button command-button--primary" type="button" disabled={!canActivate || busy} onClick={() => runRoundCommand("Demarrage", onActivateRound, RoundService.activate)}>
          <Play aria-hidden="true" size={18} />
          Demarrer manche
        </button>
        <button className="command-button" type="button" disabled={!canPause || busy} onClick={() => runRoundCommand("Pause", onPauseRound, (id) => RoundService.pause(id, "Pause admin"))}>
          <Pause aria-hidden="true" size={18} />
          Mettre en pause
        </button>
        <button className="command-button" type="button" disabled={!canResume || busy} onClick={() => runRoundCommand("Reprise", onResumeRound, (id) => RoundService.resume(id, "Reprise admin"))}>
          <RotateCcw aria-hidden="true" size={18} />
          Reprendre
        </button>
        <button className="command-button command-button--danger" type="button" disabled={!canClose || busy} onClick={() => runRoundCommand("Fermeture", onCloseRound, (id) => RoundService.close(id, "Fermeture admin"))}>
          <Flag aria-hidden="true" size={18} />
          Fermer sans publier
        </button>
      </div>

      {feedback ? (
        <p className={`command-feedback command-feedback--${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>
          {feedback.message}
        </p>
      ) : null}

      <div className="signal-strip" aria-label="Signaux live">
        <span>Late inputs: {lateInputs}</span>
        <span>Duplicate nonce: {duplicateInputs}</span>
        <span>Publication score: bloquee</span>
      </div>
    </section>
  );
}

function statusFromApi(status: string): AdminRoundStatus {
  switch (status) {
    case "SETUP":
      return "setup";
    case "BRIEFING":
      return "briefing";
    case "ACTIVE":
      return "active";
    case "SUSPENDED":
      return "suspended";
    case "VERIFICATION":
      return "verification";
    default:
      return "closed";
  }
}
