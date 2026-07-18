import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { financeTransactions, type FinanceTransaction } from "./finance-data";

export function TransactionTable({
  limit,
  transactions = financeTransactions,
  showAction = false,
}: {
  limit?: number;
  transactions?: FinanceTransaction[];
  showAction?: boolean;
}) {
  return (
    <div className="table-scroll" data-scroll-region="transactions">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Référence</TableHead>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Opération</TableHead>
            <TableHead>État</TableHead>
            <TableHead>Rapprochement</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            {showAction ? (
              <TableHead>
                <span className="sr-only">Action</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.slice(0, limit).map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.id}</TableCell>
              <TableCell>{item.user}</TableCell>
              <TableCell>{item.type}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    item.status === "Échoué"
                      ? "finance-failed"
                      : item.status === "En attente"
                        ? "finance-pending"
                        : "finance-success"
                  }
                >
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={item.reconciliation === "Divergente" ? "destructive" : "outline"}>
                  {item.reconciliation}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{item.date}</TableCell>
              <TableCell className="text-right font-medium">{item.amount}</TableCell>
              {showAction ? (
                <TableCell>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    render={<Link href={`/finance/transactions/${item.id}`} />}
                    aria-label={`Ouvrir ${item.id}`}
                  >
                    <ArrowRight />
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
