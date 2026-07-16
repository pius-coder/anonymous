export type FinanceTransaction = {
  id: string;
  user: string;
  party: string;
  type: string;
  amount: string;
  status: "Réussi" | "Échoué" | "En attente";
  date: string;
  providerStatus: string;
  ledgerStatus: string;
  reconciliation: "Rapprochée" | "À vérifier" | "Divergente";
  providerRef: string;
  idempotency: string;
};

export const financeTransactions: FinanceTransaction[] = [
  {
    id: "PAY-84019",
    user: "Aya M.",
    party: "AURORA-21",
    type: "Dépôt",
    amount: "+5 000 FCFA",
    status: "Réussi",
    date: "Il y a 4 min",
    providerStatus: "Confirmed",
    ledgerStatus: "Crédit comptabilisé",
    reconciliation: "Rapprochée",
    providerRef: "prv_••••9012",
    idempotency: "idem_••••c91a",
  },
  {
    id: "FEE-84018",
    user: "Malo K.",
    party: "AURORA-21",
    type: "Droit d’entrée",
    amount: "−2 500 FCFA",
    status: "Réussi",
    date: "Il y a 11 min",
    providerStatus: "Confirmed",
    ledgerStatus: "Débit comptabilisé",
    reconciliation: "Rapprochée",
    providerRef: "wallet-interne",
    idempotency: "idem_••••b732",
  },
  {
    id: "PAY-84017",
    user: "Liam B.",
    party: "ORBIT-08",
    type: "Dépôt",
    amount: "+3 000 FCFA",
    status: "Échoué",
    date: "Il y a 18 min",
    providerStatus: "Failed",
    ledgerStatus: "Aucun mouvement",
    reconciliation: "Divergente",
    providerRef: "prv_••••5581",
    idempotency: "idem_••••0f42",
  },
  {
    id: "PRZ-84016",
    user: "Nora E.",
    party: "PULSE-09",
    type: "Gain publié",
    amount: "+12 000 FCFA",
    status: "Réussi",
    date: "Il y a 32 min",
    providerStatus: "Not applicable",
    ledgerStatus: "Crédit comptabilisé",
    reconciliation: "Rapprochée",
    providerRef: "publication-v3",
    idempotency: "idem_••••781c",
  },
  {
    id: "RFD-84015",
    user: "Samy A.",
    party: "COBALT-14",
    type: "Remboursement",
    amount: "+1 500 FCFA",
    status: "En attente",
    date: "Il y a 1 h",
    providerStatus: "Processing",
    ledgerStatus: "Réservé",
    reconciliation: "À vérifier",
    providerRef: "prv_••••3370",
    idempotency: "idem_••••19dd",
  },
];

export function getFinanceTransaction(transactionId: string) {
  return (
    financeTransactions.find((item) => item.id === transactionId) ?? {
      ...financeTransactions[2],
      id: transactionId,
    }
  );
}
