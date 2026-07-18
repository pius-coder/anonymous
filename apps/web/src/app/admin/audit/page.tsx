import { Download, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const events = [
  ["AUD-9821", "ROUND_ACTIVATE", "admin@noya.cm", "Round / R-142", "Il y a 2 min"],
  ["AUD-9820", "ROLE_ASSIGN", "root@noya.cm", "User / usr-003", "Il y a 9 min"],
  ["AUD-9819", "PAYMENT_REFUND", "finance@noya.cm", "Payment / PAY-84015", "Il y a 14 min"],
  ["AUD-9818", "SESSION_REVOKE", "support@noya.cm", "User / usr-005", "Il y a 23 min"],
];

export default function AuditPage() {
  return <AppShell audience="Super admin" eyebrow="Traçabilité" title="Journal d’audit" subtitle="Qui a fait quoi, sur quelle entité, et pour quelle raison." actions={<Button variant="outline"><Download /> Exporter</Button>}>
    <Card className="full-height-card"><CardHeader><div className="party-card-topline"><div><CardTitle>Événements</CardTitle><CardDescription>Lecture seule et conservation contrôlée.</CardDescription></div><Badge><ShieldCheck /> Intègre</Badge></div></CardHeader><CardContent className="min-h-0 flex-1 p-0"><div className="data-table-tools"><div className="table-search"><Search /><Input placeholder="Action, acteur, entité ou corrélation…" /></div></div><div className="table-scroll"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Action</TableHead><TableHead>Acteur</TableHead><TableHead>Entité</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>{events.map(([id,action,actor,entity,date]) => <TableRow key={id}><TableCell className="font-mono text-xs">{id}</TableCell><TableCell><Badge variant="outline">{action}</Badge></TableCell><TableCell>{actor}</TableCell><TableCell>{entity}</TableCell><TableCell className="text-muted-foreground">{date}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
  </AppShell>;
}
