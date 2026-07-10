import { PhaseFlowImage } from "@/components/game/generated-art";
import { WalletFlowSvg } from "@/components/game/game-visuals";
import { SessionStatesCard } from "@/components/public/SessionStatesCard";

export function SessionMetaPanel() {
  return (
    <div className="space-y-6">
      <PhaseFlowImage className="shadow-md" />
      <WalletFlowSvg className="border-2 border-border shadow-md" />
      <SessionStatesCard />
    </div>
  );
}
