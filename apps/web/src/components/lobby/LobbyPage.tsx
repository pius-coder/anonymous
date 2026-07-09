"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/retroui/button";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/retroui/alert";
import { apiGet, apiPost, type ApiError } from "@/lib/api";
import { translateError } from "@/lib/errors.fr";
import { juice } from "@/lib/juice";

type LobbyResponse = {
  session: {
    id: string;
    code: string;
    name: string;
    status: string;
    minPlayers: number;
    maxPlayers: number;
    startTime: string | null;
    checkInDeadlineAt: string | null;
  };
  registration: { id: string; status: string; checkedInAt: string | null };
  presence: { checkedIn: number; paid: number };
};

export function LobbyPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [data, setData] = useState<LobbyResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const load = () => {
    apiGet<LobbyResponse>(`/sessions/${params.code}/lobby`).then((res) => {
      if (res.ok) setData(res.data);
      else setError(res.error);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code]);

  const checkIn = async () => {
    setCheckingIn(true);
    setError(null);
    const res = await apiPost<{ registration: { status: string } }>(
      `/sessions/${params.code}/check-in`,
    );
    setCheckingIn(false);
    if (res.ok) {
      juice.unlock();
      juice.play("success");
      load();
    } else {
      setError(res.error);
    }
  };

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>{translateError(error.code, error.status)}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!data) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-muted-foreground">Chargement du lobby…</main>;
  }

  const isCheckedIn = data.registration.status === "CHECKED_IN" || data.registration.status === "IN_ROOM";
  const isLive = data.session.status === "LIVE" || data.session.status === "ACTIVE" || data.session.status === "WAITING_START";

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-head text-4xl font-black uppercase">{data.session.name}</h1>
        <Badge variant="outline">{data.session.code}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-2xl uppercase">Salle d&apos;attente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Joueurs payés</span>
            <span className="font-bold">{data.presence.paid}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-in effectué</span>
            <span className="font-bold text-[--arena-green]">{data.presence.checkedIn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ton statut</span>
            <span className={`font-bold ${isCheckedIn ? "text-[--arena-green]" : "text-[--arena-gold]"}`}>
              {data.registration.status}
            </span>
          </div>
        </CardContent>
      </Card>

      {isCheckedIn && isLive && (
        <Button size="lg" onClick={() => router.push(`/session/${params.code}/live`)}>
          Entrer dans le live →
        </Button>
      )}

      {!isCheckedIn && (
        <Button size="lg" onClick={checkIn} disabled={checkingIn}>
          {checkingIn ? "Check-in…" : "Se signaler (check-in)"}
        </Button>
      )}

      {isCheckedIn && !isLive && (
        <Alert>
          <AlertTitle>En attente du démarrage</AlertTitle>
          <AlertDescription>Le serveur lancera la session dès que le minimum de joueurs est atteint.</AlertDescription>
        </Alert>
      )}
    </main>
  );
}
