import { MessageCircle, Mic, MicOff, Users } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { ArenaRoomCanvas } from "@/components/game/ArenaRoomCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PixelAvatar } from "@/components/ui/PixelAvatar";
import { ScrollArea } from "@/components/ui/scroll-area";

const participants = ["Vous", "Malo", "Aya", "Sam", "Inès", "Liam"];

export default async function PartyRoomPage({ params }: { params: Promise<{ partyCode: string }> }) {
  const { partyCode } = await params;
  return (
    <AppShell
      audience="Joueur"
      eyebrow={`Room ${partyCode}`}
      title="Le foyer des joueurs"
      subtitle="Explorez la room, retrouvez votre groupe et attendez l’ouverture de la prochaine manche."
      actions={<Badge className="hidden sm:inline-flex">6 en ligne</Badge>}
    >
      <div className="room-layout">
        <section className="room-stage" aria-label="Espace de jeu 2D">
          <ArenaRoomCanvas displayName="Vous" />
          <div className="room-toolbar">
            <Button size="icon-lg" variant="secondary" aria-label="Activer le micro">
              <Mic />
            </Button>
            <Button size="icon-lg" variant="outline" aria-label="Couper le micro">
              <MicOff />
            </Button>
            <Button variant="secondary">
              <MessageCircle />
              Discussion
            </Button>
          </div>
        </section>

        <Card className="room-roster">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Users /> Présents</span>
              <Badge variant="outline">6/12</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <ScrollArea className="h-full pr-2" data-scroll-region="roster">
              <div className="room-player-list">
                {participants.map((name, index) => (
                  <div className="room-player" key={name}>
                    <PixelAvatar seed={name} size="sm" />
                    <span>
                      <strong>{name}</strong>
                      <small>{index < 4 ? "Dans la room" : "Salon vocal"}</small>
                    </span>
                    <i aria-label="En ligne" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
