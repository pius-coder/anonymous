import type { Metadata } from "next";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { getNotifications } from "@/actions/notifications";

export const metadata: Metadata = {
  title: "Notifications - Session Jeu",
  description: "Consultez les rappels et messages importants de vos sessions.",
};

export default async function NotificationsPage() {
  const result = await getNotifications();

  return (
    <section className="px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Badge variant="outline">Centre joueur</Badge>
        <h1 className="mt-3 text-4xl font-black uppercase">Notifications</h1>
        <p className="mt-2 text-muted-foreground">
          Rappels de session, paiement, check-in et resultats importants.
        </p>
      </div>

      {!result.authenticated ? (
        <Card>
          <CardHeader>
            <CardTitle>Connexion requise</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Connectez-vous pour voir vos notifications de session.
            </p>
          </CardContent>
        </Card>
      ) : result.entries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucune notification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Vos rappels critiques apparaitront ici des qu une session evolue.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {result.entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span>{entry.title}</span>
                  <span className="text-xs font-normal text-muted-foreground">{entry.type}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{entry.body}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("fr-CM")} - {entry.status}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
