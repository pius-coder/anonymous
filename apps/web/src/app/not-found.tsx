import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/PageState";

export default function NotFound() {
  return <main className="grid h-dvh place-items-center p-4"><PageState kind="empty" title="Page introuvable" message="Cette page n’est pas disponible ou son accès public a été retiré." action={<Button render={<Link href="/parties" />}>Retour aux parties</Button>} /></main>;
}
