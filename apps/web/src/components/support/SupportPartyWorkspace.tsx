"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  FilePlus2,
  MessageSquarePlus,
  ShieldCheck,
  UserRound,
  Wifi,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadonlyBadge } from "@/components/ui/ReadonlyBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { getSupportParty } from "./support-data";

type SupportParty = ReturnType<typeof getSupportParty>;

export function SupportPartyWorkspace({ party }: { party: SupportParty }) {
  const [dialog, setDialog] = useState<"note" | "incident" | null>(null);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");

  function confirmAction() {
    if (!reason.trim()) return;
    setFeedback(
      dialog === "note"
        ? "Note ajoutée à la piste d’audit locale."
        : "Incident INC-119 ouvert et tracé localement.",
    );
    setDialog(null);
    setReason("");
  }

  function updateIncident(action: "assigné" | "escaladé" | "résolu") {
    setFeedback(
      `Incident INC-118 ${action}; l’acteur et l’horodatage ont été ajoutés à l’audit local.`,
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border-2 bg-card p-3 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <ReadonlyBadge label="Dossier partie readonly" />
          <Badge variant="outline">Synchronisé {party.updatedAt}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialog("note")}>
            <MessageSquarePlus /> Ajouter une note
          </Button>
          <Button onClick={() => setDialog("incident")}>
            <FilePlus2 /> Ouvrir un incident
          </Button>
        </div>
      </div>
      {feedback ? (
        <Alert status="success">
          <ShieldCheck />
          <AlertTitle>Action enregistrée</AlertTitle>
          <AlertDescription>{feedback}</AlertDescription>
        </Alert>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Résumé du dossier">
        <Summary label="Partie" value={party.code} icon={ClipboardList} />
        <Summary label="Participant" value={party.participant} icon={UserRound} />
        <Summary label="Phase" value={party.phase} icon={ShieldCheck} />
        <Summary label="Connexion" value={party.connection} icon={Wifi} />
        <Summary label="Paiement public" value={party.payment} icon={ShieldCheck} />
      </section>
      <Alert status="warning">
        <AlertTriangle />
        <AlertTitle>Dernière erreur redigée</AlertTitle>
        <AlertDescription>
          {party.lastError} Aucun token live, payload provider ou état privé n’est affiché.
        </AlertDescription>
      </Alert>
      <Tabs defaultValue="timeline" className="min-h-0">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="participant">Participant</TabsTrigger>
          <TabsTrigger value="snapshot">Snapshot autorisé</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Chronologie redigée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {party.timeline.map((event) => (
                <div
                  key={`${event.time}-${event.title}`}
                  className="grid gap-1 border-l-2 border-primary pl-3 sm:grid-cols-[64px_1fr]"
                >
                  <span className="font-mono text-xs text-muted-foreground">{event.time}</span>
                  <div>
                    <strong>{event.title}</strong>
                    <p className="text-sm text-muted-foreground">{event.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="participant">
          <Card>
            <CardHeader>
              <CardTitle>{party.participant}</CardTitle>
              <CardDescription>Participation et état public du joueur.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                render={<Link href={`/support/parties/${party.id}/players/${party.playerId}`} />}
              >
                Ouvrir le snapshot joueur <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="snapshot">
          <Card>
            <CardHeader>
              <CardTitle>Projection autorisée</CardTitle>
              <CardDescription>Phase, connexion et feedback public seulement.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Summary label="Phase joueur" value="Manche active" icon={ShieldCheck} />
              <Summary label="Dernier input" value="Reçu à 15:41" icon={ClipboardList} />
              <Summary label="Blocage" value="Reconnexion expirée" icon={AlertTriangle} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Incidents liés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {party.incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border-2 p-3"
                >
                  <div>
                    <div className="flex gap-2">
                      <Badge variant="destructive">{incident.severity}</Badge>
                      <Badge variant="outline">{incident.status}</Badge>
                    </div>
                    <strong className="mt-2 block">{incident.title}</strong>
                    <p className="text-xs text-muted-foreground">
                      {incident.id} · {incident.owner}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => updateIncident("assigné")}>
                      M’assigner
                    </Button>
                    <Button variant="outline" onClick={() => updateIncident("escaladé")}>
                      Escalader
                    </Button>
                    <Button onClick={() => updateIncident("résolu")}>Résoudre</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Piste d’audit support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {party.audit.map((row) => (
                <div
                  key={`${row.time}-${row.action}`}
                  className="grid gap-1 rounded border-2 p-3 sm:grid-cols-[64px_130px_1fr]"
                >
                  <span className="font-mono text-xs">{row.time}</span>
                  <strong>{row.actor}</strong>
                  <span>
                    {row.action} · <span className="text-muted-foreground">{row.reason}</span>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AlertDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog === "incident" ? "Ouvrir un incident" : "Ajouter une note"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est enregistrée avec l’acteur, le dossier et la raison. Elle ne modifie
              ni la manche, ni un score, ni l’état du joueur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Raison obligatoire…"
            aria-label="Raison de l’action"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={!reason.trim()} onClick={confirmAction}>
              Confirmer et auditer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <div className="rounded border-2 bg-card p-3 shadow-sm">
      <Icon className="mb-2 size-4 text-primary" />
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className="text-sm">{value}</strong>
    </div>
  );
}
