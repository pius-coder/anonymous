import { TransactionDetail } from "@/components/finance/TransactionDetail";
import { AppShell } from "@/components/ui/AppShell";

export default async function FinanceTransactionPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = await params;
  const id = decodeURIComponent(transactionId);
  return (
    <AppShell
      audience="Finance"
      eyebrow="Détail transaction"
      title={id}
      subtitle="Statut provider redigé, mouvement ledger et réconciliation auditable."
    >
      <TransactionDetail transactionId={id} />
    </AppShell>
  );
}
