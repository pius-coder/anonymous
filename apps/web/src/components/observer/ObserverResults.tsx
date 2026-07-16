import Link from "next/link";
import { ArrowLeft, LockKeyhole, Trophy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadonlyBadge } from "@/components/ui/ReadonlyBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { getObserverParty } from "./observer-data";

export function ObserverResults({
  party,
  published = true,
}: {
  party: ReturnType<typeof getObserverParty>;
  published?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReadonlyBadge label="Résultats publics" />
        <Button variant="outline" render={<Link href={`/observe/parties/${party.id}`} />}>
          <ArrowLeft /> Retour au direct
        </Button>
      </div>
      {!published ? (
        <Alert status="info">
          <LockKeyhole />
          <AlertTitle>Résultats en attente</AlertTitle>
          <AlertDescription>
            Le classement n’est pas encore publié. Aucun score provisoire n’est visible dans cet
            espace.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Classement officiel</CardTitle>
            <CardDescription>Version publiée · Manche 1 · {party.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rang</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Score officiel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {party.results.map((row) => (
                  <TableRow key={row.rank}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 font-head">
                        {row.rank === 1 ? <Trophy className="size-4 text-primary" /> : null}#
                        {row.rank}
                      </span>
                    </TableCell>
                    <TableCell>{row.player}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
