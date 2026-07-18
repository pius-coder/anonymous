import { Bell, CheckCheck, CreditCard, Gamepad2, Megaphone } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const notifications = [
  { icon: Gamepad2, title: "Le check-in est ouvert", body: "Nuit des stratèges démarre dans 22 minutes.", time: "Il y a 2 min", unread: true },
  { icon: CreditCard, title: "Paiement confirmé", body: "Votre dépôt de 5 000 FCFA est disponible.", time: "Il y a 14 min", unread: true },
  { icon: Megaphone, title: "Annonce de session", body: "Le briefing sera accessible cinq minutes avant le départ.", time: "Hier", unread: false },
];

export default function NotificationsPage() {
  return <AppShell audience="Joueur" eyebrow="Centre d’information" title="Notifications" subtitle="Messages in-app et statut de livraison visibles au même endroit." actions={<Button variant="outline"><CheckCheck /> Tout marquer comme lu</Button>}>
    <Card className="notifications-card"><CardHeader><CardTitle>Boîte de réception</CardTitle><CardDescription>2 nouveaux messages</CardDescription></CardHeader><CardContent className="notification-list">{notifications.map(({ icon: Icon, ...item }) => <article className={`notification-item ${item.unread ? "notification-item--unread" : ""}`} key={item.title}><span className="notification-icon"><Icon /></span><div><div><strong>{item.title}</strong>{item.unread ? <Badge>Nouveau</Badge> : null}</div><p>{item.body}</p><small>{item.time}</small></div><Bell /></article>)}</CardContent></Card>
  </AppShell>;
}
