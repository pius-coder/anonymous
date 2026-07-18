import { CheckCircle2, Clock3, DatabaseZap, FileKey2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function CompliancePage() {
  return <AppShell audience="Super admin" eyebrow="Contrôles" title="Conformité" subtitle="Rétention, intégrité, accès privilégiés et revues périodiques." actions={<Badge><ShieldCheck /> 92% conforme</Badge>}>
    <div className="compliance-grid">{[
      [FileKey2,"Revue des accès staff","9/9 comptes revus",100,"À jour"],
      [DatabaseZap,"Rétention des événements","Politique appliquée sur 4 domaines",88,"1 action"],
      [ShieldCheck,"Intégrité du ledger","Dernier rapprochement sans écart",100,"À jour"],
      [Clock3,"Rotation des secrets","Prochaine échéance dans 8 jours",72,"Planifiée"],
    ].map(([Icon,title,copy,value,status]) => { const Glyph = Icon as typeof ShieldCheck; return <Card key={String(title)}><CardHeader><div className="party-card-topline"><span className="metric-icon"><Glyph /></span><Badge variant="outline">{String(status)}</Badge></div><CardTitle>{String(title)}</CardTitle><CardDescription>{String(copy)}</CardDescription></CardHeader><CardContent><div className="section-heading-row"><span>Couverture</span><strong>{Number(value)}%</strong></div><Progress value={Number(value)} /><Button variant="ghost" className="mt-3 w-full"><CheckCircle2 /> Voir le contrôle</Button></CardContent></Card>; })}</div>
  </AppShell>;
}
