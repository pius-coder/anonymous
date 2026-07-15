import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { uiTransactions } from "@/lib/ui-data";

export function TransactionTable({ limit }: { limit?: number }) {
  return (
    <div className="table-scroll" data-scroll-region="transactions">
      <Table>
        <TableHeader><TableRow><TableHead>Référence</TableHead><TableHead>Utilisateur</TableHead><TableHead>Opération</TableHead><TableHead>État</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
        <TableBody>
          {uiTransactions.slice(0, limit).map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.id}</TableCell>
              <TableCell>{item.user}</TableCell>
              <TableCell>{item.type}</TableCell>
              <TableCell><Badge variant="outline" className={item.status === "Échoué" ? "finance-failed" : item.status === "En attente" ? "finance-pending" : "finance-success"}>{item.status}</Badge></TableCell>
              <TableCell className="text-muted-foreground">{item.date}</TableCell>
              <TableCell className="text-right font-medium">{item.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
