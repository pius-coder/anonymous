import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

const steps = [
  { key: "participation", label: "Inscription" },
  { key: "payment", label: "Paiement" },
  { key: "lobby", label: "Préparation" },
  { key: "room", label: "Room" },
  { key: "round", label: "Manche" },
  { key: "results", label: "Résultats" },
] as const;

type Step = (typeof steps)[number]["key"];

type PlayerJourneyNavProps = { current: Step } & (
  { partyCode: string; party?: never } | { party: { code: string }; partyCode?: never }
);

export function PlayerJourneyNav(props: PlayerJourneyNavProps) {
  const { current } = props;
  const partyCode = "partyCode" in props ? props.partyCode : props.party.code;
  const currentIndex = steps.findIndex((step) => step.key === current);

  return (
    <nav aria-label="Progression dans la partie" className="mb-5 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 rounded-lg border bg-card p-2">
        {steps.map((step, index) => {
          const isCurrent = step.key === current;
          const isComplete = index < currentIndex;
          return (
            <li className="flex items-center" key={step.key}>
              <Link
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isCurrent ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                href={`/parties/${partyCode}/${step.key}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className="grid size-5 place-items-center rounded-full border text-xs">
                  {isComplete ? <Check className="size-3" aria-hidden="true" /> : index + 1}
                </span>
                {step.label}
              </Link>
              {index < steps.length - 1 ? (
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
