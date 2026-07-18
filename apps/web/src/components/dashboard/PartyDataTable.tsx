"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock, Gamepad2, Search, Users } from "lucide-react";
import type { UiParty } from "@/lib/ui-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabel: Record<UiParty["status"], string> = {
  scheduled: "Planifiée",
  preparation: "Préparation",
  live: "En direct",
  review: "À vérifier",
  published: "Publiée",
};

export function PartyDataTable({ parties, compact = false }: { parties: UiParty[]; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UiParty | null>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return parties;
    return parties.filter((party) => `${party.name} ${party.code} ${party.game}`.toLowerCase().includes(needle));
  }, [parties, query]);

  return (
    <>
      <div className="data-table-shell">
        {!compact ? (
          <div className="data-table-tools">
            <div className="table-search">
              <Search aria-hidden="true" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une session…" />
            </div>
            <Badge variant="outline">{filtered.length} sessions</Badge>
          </div>
        ) : null}
        <div className="table-scroll" data-scroll-region="table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Joueurs</TableHead>
                <TableHead>Départ</TableHead>
                <TableHead className="text-right">Entrée</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((party) => (
                <TableRow key={party.id} className="cursor-pointer" onClick={() => setSelected(party)}>
                  <TableCell>
                    <span className="table-primary">{party.name}</span>
                    <small className="table-secondary">{party.code} · {party.game}</small>
                  </TableCell>
                  <TableCell><StatusBadge status={party.status} /></TableCell>
                  <TableCell>{party.players}/{party.capacity}</TableCell>
                  <TableCell>{party.startsAt}</TableCell>
                  <TableCell className="text-right font-medium">{party.entryFee}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-md" side="right">
          {selected ? (
            <>
              <SheetHeader>
                <div className="mb-2"><StatusBadge status={selected.status} /></div>
                <SheetTitle className="font-head text-xl">{selected.name}</SheetTitle>
                <SheetDescription>{selected.code} · Vue opérationnelle de la session</SheetDescription>
              </SheetHeader>
              <div className="sheet-body" data-scroll-region="sheet">
                <div className="sheet-stat-grid">
                  <SheetStat icon={Users} label="Joueurs" value={`${selected.players}/${selected.capacity}`} />
                  <SheetStat icon={CalendarClock} label="Départ" value={selected.startsAt} />
                  <SheetStat icon={Gamepad2} label="Jeu" value={selected.game} />
                </div>
                <section className="sheet-section">
                  <div className="section-heading-row">
                    <h3>Remplissage</h3>
                    <span>{Math.round((selected.players / selected.capacity) * 100)}%</span>
                  </div>
                  <Progress value={(selected.players / selected.capacity) * 100} />
                </section>
                <section className="sheet-section">
                  <h3>Règles visibles</h3>
                  <ul className="clean-list">
                    <li>Admission confirmée avant l’accès à la room</li>
                    <li>Manche démarrée uniquement par un administrateur</li>
                    <li>Résultats masqués avant publication explicite</li>
                  </ul>
                </section>
              </div>
              <SheetFooter>
                <Button render={<Link href={`/admin/parties/${selected.id}/control`} />} className="w-full">
                  Ouvrir le pilotage <ArrowUpRight />
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function StatusBadge({ status }: { status: UiParty["status"] }) {
  return <Badge variant="outline" className={`status-badge status-badge--${status}`}>{statusLabel[status]}</Badge>;
}

function SheetStat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="sheet-stat">
      <Icon />
      <span><small>{label}</small><strong>{value}</strong></span>
    </div>
  );
}
