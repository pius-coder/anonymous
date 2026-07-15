import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Gamepad2, TicketCheck } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { uiParties } from "@/lib/ui-data";

export default function TicketsPage() {
  return <AppShell audience="Joueur" eyebrow="Mes inscriptions" title="Tickets et accès" subtitle="Chaque ticket explique clairement ce qui est confirmé et la prochaine action.">
    <div className="ticket-grid">{uiParties.slice(0, 3).map((party, index) => <Card key={party.id} className="ticket-card"><CardHeader><div className="party-card-topline"><Badge>{index === 0 ? "Check-in ouvert" : "Confirmé"}</Badge><TicketCheck /></div><CardTitle>{party.name}</CardTitle><CardDescription>{party.code}</CardDescription></CardHeader><CardContent className="ticket-info"><div><CalendarClock /><span><small>Départ</small><strong>{party.startsAt}</strong></span></div><div><Gamepad2 /><span><small>Mini-jeu</small><strong>{party.game}</strong></span></div><div><CheckCircle2 /><span><small>Paiement</small><strong>Confirmé</strong></span></div></CardContent><CardFooter><Button render={<Link href={`/parties/${party.code}/${index === 0 ? "room" : "waiting"}`} />} className="w-full" variant={index === 0 ? "default" : "secondary"}>{index === 0 ? "Entrer dans la room" : "Voir le ticket"}<ArrowRight /></Button></CardFooter></Card>)}</div>
  </AppShell>;
}
