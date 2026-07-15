import { Search, WalletCards } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { uiUsers } from "@/lib/ui-data";

export default function WalletsPage() {
  return <AppShell audience="Finance" eyebrow="Ledger utilisateurs" title="Portefeuilles" subtitle="Consulter les soldes et leurs états sans les éditer directement.">
    <Card className="full-height-card"><CardHeader><CardTitle>Comptes wallet</CardTitle><CardDescription>Les ajustements passent par une écriture compensatoire auditée.</CardDescription></CardHeader><CardContent className="min-h-0 flex-1 p-0"><div className="data-table-tools"><div className="table-search"><Search /><Input placeholder="Utilisateur ou identifiant wallet…" /></div><Badge variant="outline"><WalletCards /> 1,8M FCFA</Badge></div><div className="table-scroll"><Table><TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Wallet</TableHead><TableHead>État</TableHead><TableHead className="text-right">Solde</TableHead></TableRow></TableHeader><TableBody>{uiUsers.filter((user) => user.wallet !== "—").map((user) => <TableRow key={user.id}><TableCell><span className="table-primary">{user.name}</span><small className="table-secondary">{user.email}</small></TableCell><TableCell className="font-mono text-xs">WLT-{user.id.slice(-3)}</TableCell><TableCell><Badge variant="outline">Rapproché</Badge></TableCell><TableCell className="text-right font-medium">{user.wallet}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
  </AppShell>;
}
