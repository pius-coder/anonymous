"use client";

import { useMemo, useState } from "react";
import { Mail, Search, Shield, UserRound, WalletCards } from "lucide-react";
import { uiUsers } from "@/lib/ui-data";
import { PixelAvatar } from "@/components/ui/PixelAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UserRow = (typeof uiUsers)[number];

export function UserDirectory() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const users = useMemo(() => uiUsers.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <>
      <div className="data-table-shell">
        <div className="data-table-tools">
          <div className="table-search"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, email ou rôle…" /></div>
          <Button>Inviter un utilisateur</Button>
        </div>
        <div className="table-scroll" data-scroll-region="users-table">
          <Table>
            <TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Rôle</TableHead><TableHead>État</TableHead><TableHead className="text-right">Portefeuille</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="cursor-pointer" onClick={() => setSelected(user)}>
                  <TableCell><div className="user-cell"><PixelAvatar seed={user.email} size="sm" /><span><strong>{user.name}</strong><small>{user.email}</small></span></div></TableCell>
                  <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                  <TableCell><span className={`inline-status ${user.status === "Suspendu" ? "inline-status--danger" : ""}`}>{user.status}</span></TableCell>
                  <TableCell className="text-right">{user.wallet}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-md">
          {selected ? <>
            <SheetHeader><div className="mb-2"><PixelAvatar seed={selected.email} size="lg" /></div><SheetTitle>{selected.name}</SheetTitle><SheetDescription>{selected.id} · Compte et droits d’accès</SheetDescription></SheetHeader>
            <div className="sheet-body" data-scroll-region="user-sheet">
              <div className="sheet-stat-grid">
                <div className="sheet-stat"><Mail /><span><small>Email</small><strong>{selected.email}</strong></span></div>
                <div className="sheet-stat"><Shield /><span><small>Rôle courant</small><strong>{selected.role}</strong></span></div>
                <div className="sheet-stat"><WalletCards /><span><small>Portefeuille</small><strong>{selected.wallet}</strong></span></div>
              </div>
              <section className="sheet-section">
                <h3>Accès au compte</h3>
                <div className="setting-row"><div><strong>Compte actif</strong><small>Couper l’accès révoque les sessions.</small></div><Switch defaultChecked={selected.status !== "Suspendu"} /></div>
              </section>
              <section className="sheet-section"><h3>Principe de sécurité</h3><p className="muted-copy">Toute modification de rôle exige une raison et génère une entrée d’audit immuable.</p></section>
            </div>
            <SheetFooter><Button variant="outline" className="w-full"><UserRound /> Modifier les rôles</Button></SheetFooter>
          </> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
