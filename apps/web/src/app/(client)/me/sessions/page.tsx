"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/retroui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Skeleton } from "@/components/retroui/skeleton";
import { apiGet, type ApiError } from "@/lib/api";
import { translateError } from "@/lib/errors.fr";
import { useSession } from "@/lib/useSession";

type HistoryEntry = {
  registrationId: string;
  session: {
    id: string;
    code: string;
    name: string;
    status: string;
    startTime: string | null;
    endTime: string | null;
  };
  registrationStatus: string;
  bucket: "future" | "live" | "completed" | "cancelled" | "no-show";
  result: { finalRank: number | null; finalStatus: string | null; prizeWonXaf: number | null } | null;
};

const BUCKET_LABEL: Record<HistoryEntry["bucket"], string> = {
  future: "À venir",
  live: "En cours",
  completed: "Terminées",
  cancelled: "Annulées",
  "no-show": "No-show",
};

function statusColor(status: string) {
  if (status === "PAID" || status === "CHECKED_IN" || status === "IN_ROOM") return "text-[--arena-green]";
  if (status === "PAYMENT_PENDING") return "text-[--arena-gold]";
  if (status === "CANCELLED" || status === "REFUNDED") return "text-[--arena-danger]";
  return "text-muted-foreground";
}

export default function MySessionsPage() {
  const { user, loading } = useSession();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    apiGet<{ entries: HistoryEntry[] }>("/players/me/history?limit=50")
      .then((res) => {
        if (res.ok) setEntries(res.data.entries);
        else setError(res.error);
      })
      .finally(() => setLoadingData(false));
  }, [user, loading]);

  if (loading || loadingData) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Skeleton className="mb-6 h-10 w-56" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p>Connecte-toi pour voir tes sessions.</p>
      </div>
    );
  }

  const buckets: HistoryEntry["bucket"][] = ["future", "live", "completed"];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-head text-4xl font-black uppercase">Mes sessions</h1>
      {error && <p className="mt-3 font-bold text-[--arena-danger]">{translateError(error.code, error.status)}</p>}

      <Tabs defaultValue="future" className="mt-6">
        <TabsList>
          {buckets.map((b) => (
            <TabsTrigger key={b} value={b}>
              {BUCKET_LABEL[b]} ({entries.filter((e) => e.bucket === b).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {buckets.map((b) => {
          const items = entries.filter((e) => e.bucket === b);
          return (
            <TabsContent key={b} value={b} className="mt-4">
              {items.length === 0 ? (
                <p className="text-muted-foreground">Aucune session.</p>
              ) : (
                <div className="grid gap-3">
                  {items.map((entry) => (
                    <Card key={entry.registrationId}>
                      <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="font-head text-xl uppercase">{entry.session.name}</CardTitle>
                        <Badge variant="outline">#{entry.session.code}</Badge>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-3">
                        <span className={`font-bold ${statusColor(entry.registrationStatus)}`}>
                          {entry.registrationStatus}
                        </span>
                        {entry.result && (
                          <span className="text-sm text-muted-foreground">
                            Rang {entry.result.finalRank ?? "—"} ·{" "}
                            {entry.result.prizeWonXaf
                              ? new Intl.NumberFormat("fr-FR").format(entry.result.prizeWonXaf) + " XAF"
                              : "0 XAF"}
                          </span>
                        )}
                        <div className="ml-auto flex gap-2">
                          {entry.bucket === "future" && entry.registrationStatus === "PAYMENT_PENDING" && (
                            <Link href={`/session/${entry.session.code}`}>
                              <Button size="sm" variant="outline">
                                Payer
                              </Button>
                            </Link>
                          )}
                          {entry.bucket === "future" && (entry.registrationStatus === "PAID") && (
                            <Link href={`/session/${entry.session.code}/lobby`}>
                              <Button size="sm">Lobby</Button>
                            </Link>
                          )}
                          {entry.bucket === "live" && (
                            <Link href={`/session/${entry.session.code}/live`}>
                              <Button size="sm">Rejoindre le live</Button>
                            </Link>
                          )}
                          {entry.bucket === "completed" && (
                            <Link href={`/session/${entry.session.code}/results`}>
                              <Button size="sm" variant="outline">
                                Résultats
                              </Button>
                            </Link>
                          )}
                          <Link href={`/session/${entry.session.code}`}>
                            <Button size="sm" variant="ghost">
                              Détail
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </main>
  );
}
