import { AccountPanel } from "@/components/player/AccountPanel";
import { AppShell } from "@/components/ui/AppShell";

export default function AccountPage() {
  return (
    <AppShell
      audience="Joueur"
      eyebrow="Mon espace"
      title="Compte joueur"
      subtitle="Identité, session et accès personnels."
    >
      <AccountPanel />
    </AppShell>
  );
}
