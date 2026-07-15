import { ArrowDownLeft, ArrowUpRight, Plus, ShieldCheck, WalletCards } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionTable } from "@/components/finance/TransactionTable";

export default function WalletPage() {
  return <AppShell audience="Joueur" eyebrow="Mon argent" title="Portefeuille" subtitle="Solde disponible, mouvements et retraits dans une vue claire." actions={<Button><Plus /> Recharger</Button>}>
    <div className="wallet-layout">
      <Card className="wallet-balance-card"><CardHeader><CardDescription>Solde disponible</CardDescription><CardTitle className="wallet-balance">18 450 <small>FCFA</small></CardTitle></CardHeader><CardContent><div className="wallet-actions"><Button variant="secondary"><ArrowDownLeft /> Déposer</Button><Button variant="outline"><ArrowUpRight /> Retirer</Button></div><p className="booking-safety"><ShieldCheck /> Solde calculé depuis le ledger, jamais depuis le navigateur.</p></CardContent></Card>
      <Card><CardHeader><CardTitle>En jeu</CardTitle><CardDescription>Montants réservés pour des sessions.</CardDescription></CardHeader><CardContent><strong className="wallet-secondary-value">3 500 FCFA</strong><div className="wallet-reservation"><WalletCards /><span><strong>2 réservations</strong><small>Libérées automatiquement si la session est annulée.</small></span></div></CardContent></Card>
      <Card className="wallet-history"><CardHeader><div className="party-card-topline"><div><CardTitle>Derniers mouvements</CardTitle><CardDescription>Historique financier personnel</CardDescription></div><Badge variant="outline">Ledger vérifié</Badge></div></CardHeader><CardContent className="min-h-0 flex-1 p-0"><TransactionTable /></CardContent></Card>
    </div>
  </AppShell>;
}
