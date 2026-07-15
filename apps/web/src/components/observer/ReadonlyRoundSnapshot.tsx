import { ReadonlyBadge } from "@/components/ui/ReadonlyBadge";

type PublicSignal = {
  label: string;
  value: string;
};

type PublicParticipant = {
  label: string;
  status: string;
};

export type ReadonlyRoundSnapshotProps = {
  partyId: string;
  roundStatus: string;
  currentRoundNumber: number;
  minigameName: string;
  publicSignals: PublicSignal[];
  participants: PublicParticipant[];
};

export function ReadonlyRoundSnapshot({
  partyId,
  roundStatus,
  currentRoundNumber,
  minigameName,
  publicSignals,
  participants,
}: ReadonlyRoundSnapshotProps) {
  return (
    <section className="observer-snapshot" aria-labelledby="observer-snapshot-title">
      <div className="panel-heading">
        <div>
          <p className="label">Partie {partyId}</p>
          <h2 id="observer-snapshot-title">Projection autorisee</h2>
        </div>
        <ReadonlyBadge />
      </div>

      <div className="snapshot-summary">
        <div>
          <span className="label">Phase</span>
          <strong>{roundStatus}</strong>
        </div>
        <div>
          <span className="label">Round</span>
          <strong>{currentRoundNumber}</strong>
        </div>
        <div>
          <span className="label">Mini-jeu</span>
          <strong>{minigameName}</strong>
        </div>
      </div>

      <div className="snapshot-grid">
        <section aria-labelledby="signals-title">
          <h3 id="signals-title">Signaux publics</h3>
          <dl className="state-list">
            {publicSignals.map((signal) => (
              <div key={signal.label}>
                <dt>{signal.label}</dt>
                <dd>{signal.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="participants-title">
          <h3 id="participants-title">Participants</h3>
          <dl className="state-list">
            {participants.map((participant) => (
              <div key={participant.label}>
                <dt>{participant.label}</dt>
                <dd>{participant.status}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </section>
  );
}

