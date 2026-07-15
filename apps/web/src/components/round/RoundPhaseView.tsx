"use client";

import { Clock, Flag, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { ConnectionStatus, type ConnectionState } from "@/components/ui/ConnectionStatus";
import { LifecycleBanner } from "@/components/ui/LifecycleBanner";
import { PageState } from "@/components/ui/PageState";
import { RoundService } from "@/services/round/RoundService";

export type RoundPhase =
  | "briefing"
  | "active"
  | "finished"
  | "paused"
  | "reconnecting"
  | "input_rejected"
  | "closed";

export type RoundPhaseViewProps = {
  partyCode: string;
  roundId?: string;
  roundNumber: number;
  minigameName: string;
  phase: RoundPhase;
  connection: ConnectionState;
  deadlineLabel?: string;
  rejectionReason?: string;
  rules?: string[];
  onFinish?: () => Promise<void> | void;
};

const phaseStatus: Record<RoundPhase, string> = {
  briefing: "ROUND_BRIEFING",
  active: "ROUND_ACTIVE",
  finished: "ROUND_VERIFICATION",
  paused: "ROUND_PAUSED",
  reconnecting: "RECONNECTING",
  input_rejected: "INPUT_REJECTED",
  closed: "ROUND_CLOSED",
};

export function RoundPhaseView({
  partyCode,
  roundId,
  roundNumber,
  minigameName,
  phase,
  connection,
  deadlineLabel,
  rejectionReason,
  rules = ["Attendre le demarrage admin", "Soumettre une seule action valide", "Terminer avant la deadline"],
  onFinish,
}: RoundPhaseViewProps) {
  const status = phaseStatus[phase];
  const [finishState, setFinishState] = useState<{ kind: "idle" | "pending" | "success" | "error"; message?: string }>({ kind: "idle" });

  async function finishRound() {
    setFinishState({ kind: "pending", message: "Envoi de la fin de manche" });
    try {
      if (onFinish) {
        await onFinish();
      } else if (roundId) {
        const response = await RoundService.finish(roundId, { actionNonce: createActionNonce() });
        if (!response.success) throw new Error(`${response.error.code}: ${response.error.message}`);
        setFinishState({
          kind: "success",
          message: response.data.duplicate ? "Fin deja prise en compte" : "Fin de manche recue",
        });
        return;
      }
      setFinishState({ kind: "success", message: "Fin de manche recue" });
    } catch (err) {
      setFinishState({ kind: "error", message: err instanceof Error ? err.message : "Input refuse" });
    }
  }

  return (
    <section className="round-layout" aria-labelledby="round-title">
      <div className="round-topline">
        <div>
          <p className="label">Partie {partyCode}</p>
          <h2 id="round-title">Manche {roundNumber}</h2>
        </div>
        <ConnectionStatus state={connection} />
      </div>

      <LifecycleBanner
        status={status}
        detail={phaseDetail(phase)}
        meta={
          deadlineLabel ? (
            <span className="timer-chip">
              <Clock aria-hidden="true" size={16} />
              {deadlineLabel}
            </span>
          ) : null
        }
      />

      <div className="round-grid">
        <section className="round-panel" aria-labelledby="minigame-title">
          <div className="panel-heading">
            <div>
              <p className="label">Mini-jeu</p>
              <h3 id="minigame-title">{minigameName}</h3>
            </div>
            <span className="phase-token">{status}</span>
          </div>

          {phase === "briefing" ? <BriefingRules rules={rules} /> : null}
          {phase === "active" ? (
            <ActiveRoundSurface
              canFinish={Boolean(roundId || onFinish)}
              finishState={finishState}
              onFinish={finishRound}
            />
          ) : null}
          {phase === "paused" ? (
            <PageState
              kind="empty"
              title="Manche en pause"
              message="Les inputs competitifs sont bloques jusqu'a reprise admin."
            />
          ) : null}
          {phase === "reconnecting" ? (
            <PageState
              kind="loading"
              title="Reconnexion live"
              message="La place joueur est conservee pendant la fenetre autorisee."
            />
          ) : null}
          {phase === "input_rejected" ? (
            <PageState
              kind="error"
              title="Input refuse"
              message={rejectionReason ?? "LATE_INPUT: la manche n'accepte plus cette action."}
            />
          ) : null}
          {phase === "finished" || phase === "closed" ? <WaitingReviewState /> : null}
        </section>

        <aside className="round-panel round-side" aria-label="Etat joueur">
          <p className="label">Projection joueur</p>
          <dl className="state-list">
            <div>
              <dt>Phase</dt>
              <dd>{status}</dd>
            </div>
            <div>
              <dt>Input competitif</dt>
              <dd>{phase === "active" ? "Ouvert" : "Ferme"}</dd>
            </div>
            <div>
              <dt>Scores</dt>
              <dd>Non publies</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

function phaseDetail(phase: RoundPhase) {
  switch (phase) {
    case "briefing":
      return "Briefing affiche, attente du demarrage manuel admin.";
    case "active":
      return "Round actif, les inputs joueur sont acceptes jusqu'a deadline.";
    case "finished":
      return "Manche terminee, attente de verification admin sans publication.";
    case "paused":
      return "Manche suspendue, timer conserve cote serveur.";
    case "reconnecting":
      return "Connexion en reprise, aucun input n'est rejoue automatiquement.";
    case "input_rejected":
      return "La derniere commande a ete refusee par l'autorite serveur.";
    case "closed":
      return "Round ferme techniquement, passage en verification.";
  }
}

function BriefingRules({ rules }: { rules: string[] }) {
  return (
    <div className="briefing-rules">
      {rules.map((rule) => (
        <div className="rule-row" key={rule}>
          <ShieldCheck aria-hidden="true" size={16} />
          <span>{rule}</span>
        </div>
      ))}
    </div>
  );
}

function ActiveRoundSurface({
  canFinish,
  finishState,
  onFinish,
}: {
  canFinish: boolean;
  finishState: { kind: "idle" | "pending" | "success" | "error"; message?: string };
  onFinish: () => void;
}) {
  return (
    <div className="minigame-placeholder">
      <div>
        <p className="label">Zone mini-jeu</p>
        <p>Runtime mini-jeu a connecter au framework dedie.</p>
        {finishState.message ? (
          <p className={`command-feedback command-feedback--${finishState.kind === "error" ? "error" : "success"}`} role={finishState.kind === "error" ? "alert" : "status"}>
            {finishState.message}
          </p>
        ) : null}
      </div>
      <button className="command-button command-button--primary" type="button" disabled={!canFinish || finishState.kind === "pending"} onClick={onFinish}>
        <Flag aria-hidden="true" size={18} />
        Terminer
      </button>
    </div>
  );
}

function createActionNonce() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `finish-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function WaitingReviewState() {
  return (
    <PageState
      kind="success"
      title="Attente verification"
      message="Votre manche est terminee. Les resultats restent invisibles jusqu'a publication explicite."
    />
  );
}
