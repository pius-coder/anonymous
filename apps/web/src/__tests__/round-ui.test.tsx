import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReadonlyRoundSnapshot, type ReadonlyRoundSnapshotProps } from "@/components/observer/ReadonlyRoundSnapshot";
import { RoundPhaseView } from "@/components/round/RoundPhaseView";

describe("round UI projections", () => {
  it("renders active player phase with a stable finish command", () => {
    const html = renderToStaticMarkup(
      <RoundPhaseView
        partyCode="ABC123"
        roundNumber={1}
        minigameName="Pilot memory sequence"
        phase="active"
        connection="stable"
        deadlineLabel="02:15"
      />,
    );

    expect(html).toContain("ROUND_ACTIVE");
    expect(html).toContain("Terminer");
    expect(html).toContain("Non publies");
  });

  it("keeps the waiting review view free from public scores", () => {
    const html = renderToStaticMarkup(
      <RoundPhaseView
        partyCode="ABC123"
        roundNumber={1}
        minigameName="Pilot memory sequence"
        phase="finished"
        connection="stable"
      />,
    );

    expect(html).toContain("ROUND_VERIFICATION");
    expect(html).not.toContain("95");
    expect(html).not.toContain("rang provisoire");
  });

  it("filters observer snapshot to explicit public fields", () => {
    const snapshot = {
      partyId: "party-1",
      roundStatus: "ROUND_ACTIVE",
      currentRoundNumber: 2,
      minigameName: "Public game",
      publicSignals: [{ label: "Participants actifs", value: "8" }],
      participants: [{ label: "Joueur 1", status: "Actif" }],
      hiddenAnswer: "SECRET_ANSWER",
      privatePayload: { token: "PRIVATE_TOKEN" },
    } as unknown as ReadonlyRoundSnapshotProps;

    const html = renderToStaticMarkup(<ReadonlyRoundSnapshot {...snapshot} />);

    expect(html).toContain("Projection autorisee");
    expect(html).not.toContain("SECRET_ANSWER");
    expect(html).not.toContain("PRIVATE_TOKEN");
  });
});

