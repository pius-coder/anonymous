import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/PageState";

export default function PartyNotFound() {
  return (
    <AppShell
      audience="Joueur"
      eyebrow="Partie indisponible"
      title="Cette partie est introuvable"
      subtitle="Le code est inconnu ou la session n’est plus accessible au public."
    >
      <PageState
        kind="empty"
        title="Aucune partie publique trouvée"
        message="Aucune information interne n’est exposée pour ce code."
        action={
          <Button render={<Link href="/parties" />}>
            <ArrowLeft /> Retour au catalogue
          </Button>
        }
      />
    </AppShell>
  );
}
