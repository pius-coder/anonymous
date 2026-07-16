import { CircleDollarSign, Landmark, ReceiptText, Undo2 } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FinanceLedger } from "@/components/finance/FinanceLedger";

export default function FinancePage() {
  return (
    <AppShell
      audience="Finance"
      eyebrow="Rapprochement"
      title="Vue finance"
      subtitle="Flux provider, ledger et exceptions sans accès aux données de jeu."
    >
      <div className="dashboard-stack">
        <section className="metrics-grid">
          <MetricCard
            icon={CircleDollarSign}
            label="Encaissements"
            value="184k"
            detail="FCFA aujourd’hui"
            trend="up"
          />
          <MetricCard
            icon={Landmark}
            label="Solde wallets"
            value="1,8M"
            detail="FCFA en circulation"
            trend="neutral"
          />
          <MetricCard
            icon={Undo2}
            label="Remboursements"
            value="12k"
            detail="4 opérations"
            trend="down"
          />
          <MetricCard
            icon={ReceiptText}
            label="À rapprocher"
            value="03"
            detail="provider vs ledger"
            trend="up"
          />
        </section>
        <FinanceLedger />
      </div>
    </AppShell>
  );
}
