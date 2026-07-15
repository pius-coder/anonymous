import { AlertTriangle, Clock3, LifeBuoy, UserRoundCheck } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";

export default function SupportPage() {
  return <AppShell audience="Support" eyebrow="Assistance" title="File support" subtitle="Résoudre les problèmes d’accès sans exposer les données financières ni les réponses de jeu.">
    <div className="dashboard-stack"><section className="metrics-grid metrics-grid--three"><MetricCard icon={LifeBuoy} label="Demandes ouvertes" value="12" detail="4 assignées à vous" trend="up" /><MetricCard icon={Clock3} label="Temps médian" value="8 min" detail="objectif sous 15 min" trend="down" /><MetricCard icon={AlertTriangle} label="Bloquantes" value="02" detail="accès à une session" trend="neutral" /></section><Card><CardHeader><CardTitle>Demandes prioritaires</CardTitle><CardDescription>Une action de support n’accorde jamais un droit de jeu.</CardDescription></CardHeader><CardContent className="support-list">{[["SUP-2041","Malo K.","Je ne reçois pas mon accès room","Urgent"],["SUP-2040","Liam B.","Paiement affiché en attente","Finance"],["SUP-2039","Aya M.","Nouvel appareil à vérifier","Normal"]].map(([id,user,title,priority]) => <div key={id}><UserRoundCheck /><span><small>{id} · {user}</small><strong>{title}</strong></span><Badge variant="outline">{priority}</Badge><Button variant="ghost">Ouvrir</Button></div>)}</CardContent></Card></div>
  </AppShell>;
}
