import { Download, Filter } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionTable } from "@/components/finance/TransactionTable";

export default function AdminPaymentsPage() {
  return <AppShell audience="Finance" eyebrow="Ledger et providers" title="Paiements" subtitle="Chaque mouvement est rapproché du ledger et de la réponse du provider." actions={<><Button variant="outline"><Filter /> Filtrer</Button><Button><Download /> Exporter</Button></>}>
    <Card className="full-height-card"><CardHeader><CardTitle>Transactions</CardTitle><CardDescription>Dépôts, droits d’entrée, gains et remboursements.</CardDescription></CardHeader><CardContent className="min-h-0 flex-1 p-0"><TransactionTable /></CardContent></Card>
  </AppShell>;
}
