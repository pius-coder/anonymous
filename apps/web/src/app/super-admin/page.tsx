import Link from "next/link";
import { ArrowRight, Fingerprint, ScrollText, ShieldAlert, Users } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";

export default function SuperAdminPage() {
  return <AppShell audience="Super admin" eyebrow="Gouvernance" title="Contrôle de la plateforme" subtitle="Rôles, audit, conformité et actions à haut impact dans des vues séparées.">
    <div className="dashboard-stack"><section className="metrics-grid metrics-grid--three"><MetricCard icon={Users} label="Comptes staff" value="09" detail="3 rôles opérationnels" trend="neutral" /><MetricCard icon={ScrollText} label="Événements audit" value="842" detail="sur les dernières 24 h" trend="up" /><MetricCard icon={ShieldAlert} label="Alertes sécurité" value="01" detail="à qualifier" trend="down" /></section><div className="governance-grid">{[[Fingerprint,"Rôles et accès","Réviser les attributions et révoquer les sessions.","/admin/users"],[ScrollText,"Journal d’audit","Rechercher les commandes et raisons associées.","/admin/audit"],[ShieldAlert,"Conformité","Suivre les contrôles et rétentions obligatoires.","/admin/compliance"]].map(([Icon,title,copy,href]) => { const Glyph = Icon as typeof Fingerprint; return <Card key={String(title)}><CardHeader><span className="metric-icon"><Glyph /></span><CardTitle>{String(title)}</CardTitle><CardDescription>{String(copy)}</CardDescription></CardHeader><CardContent><Button render={<Link href={String(href)} />} variant="outline" className="w-full">Ouvrir <ArrowRight /></Button></CardContent></Card>; })}</div></div>
  </AppShell>;
}
