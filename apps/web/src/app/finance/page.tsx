"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign, Landmark, ReceiptText, Undo2 } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FinanceLedger } from "@/components/finance/FinanceLedger";
import { PageState } from "@/components/ui/PageState";
import { formatXaf, paymentApi } from "@/services/payment/payment-api";

export default function FinancePage() {
  const reportQuery = useQuery({
    queryKey: ["finance-daily-report"],
    queryFn: async () => {
      const res = await paymentApi.dailyReport();
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  const mismatchQuery = useQuery({
    queryKey: ["finance-mismatches"],
    queryFn: async () => {
      const res = await paymentApi.listMismatches({ take: 20 });
      if (!res.success) throw new Error(res.error.message);
      return res.data.mismatches;
    },
  });

  const report = reportQuery.data;

  return (
    <AppShell
      audience="Finance"
      eyebrow="Rapprochement"
      title="Vue finance"
      subtitle="Flux provider, ledger et exceptions sans accès aux données de jeu."
    >
      <div className="dashboard-stack">
        {reportQuery.isError ? (
          <PageState
            kind="error"
            title="Rapport finance indisponible"
            message={(reportQuery.error as Error).message}
          />
        ) : null}
        <section className="metrics-grid">
          <MetricCard
            icon={CircleDollarSign}
            label="Encaissements (jour)"
            value={
              reportQuery.isLoading
                ? "…"
                : String(report?.collectionSuccessfulCount ?? "—")
            }
            detail={
              report
                ? `${report.collectionPendingCount} en attente · ${report.collectionFailedCount} échoués`
                : "Lecture serveur…"
            }
            trend="neutral"
          />
          <MetricCard
            icon={Landmark}
            label="Solde wallets"
            value={reportQuery.isLoading ? "…" : report ? formatXaf(report.walletBalanceSum) : "—"}
            detail={
              report
                ? `Ledger +${formatXaf(report.ledgerCredits)} / −${formatXaf(report.ledgerDebits)}`
                : "Lecture serveur…"
            }
            trend="neutral"
          />
          <MetricCard
            icon={Undo2}
            label="Payouts (jour)"
            value={reportQuery.isLoading ? "…" : String(report?.payoutCount ?? "—")}
            detail="Service Fapshi PAYOUT distinct"
            trend="neutral"
          />
          <MetricCard
            icon={ReceiptText}
            label="À rapprocher"
            value={
              mismatchQuery.isLoading
                ? "…"
                : String(mismatchQuery.data?.length ?? report?.mismatchCount ?? "—")
            }
            detail={
              report
                ? `${report.paidParticipations} participations PAID`
                : "provider vs ledger"
            }
            trend="up"
          />
        </section>
        {mismatchQuery.data && mismatchQuery.data.length > 0 ? (
          <section className="rounded-lg border p-3 text-sm" aria-label="Mismatches">
            <h2 className="mb-2 font-medium">Mismatches actionnables</h2>
            <ul className="space-y-1">
              {mismatchQuery.data.map((m) => (
                <li key={m.id} className="font-mono text-xs">
                  {m.paymentId} · {m.notes ?? m.status} · {new Date(m.createdAt).toLocaleString("fr-FR")}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <FinanceLedger />
      </div>
    </AppShell>
  );
}
