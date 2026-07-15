import { Plus } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyDataTable } from "@/components/dashboard/PartyDataTable";
import { uiParties } from "@/lib/ui-data";

export default function AdminPartiesPage() {
  return <AppShell audience="Admin" eyebrow="Opérations" title="Sessions" subtitle="Créer, planifier et piloter chaque session sans mélanger les états joueur et admin." actions={<Button><Plus /> Nouvelle session</Button>}>
    <Card className="full-height-card"><CardHeader><CardTitle>Toutes les sessions</CardTitle><CardDescription>Filtres, détails en Sheet et accès au pilotage live.</CardDescription></CardHeader><CardContent className="min-h-0 flex-1 p-0"><PartyDataTable parties={uiParties} /></CardContent></Card>
  </AppShell>;
}
