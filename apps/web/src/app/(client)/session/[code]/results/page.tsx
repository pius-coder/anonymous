"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/retroui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/retroui/collapsible";
import { apiGet, type ApiError } from "@/lib/api";
import { translateError } from "@/lib/errors.fr";
import { useSession } from "@/lib/useSession";

const nf = new Intl.NumberFormat("fr-FR");

type GameResult = {
  userId: string;
  finalRank: number | null;
  totalScore: number;
  finalStatus: string;
  prizeWonXaf: number;
};

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const dur = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setDisplay(Math.round(from + (value - from) * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{nf.format(display)}</span>;
}

export default function ResultsPage() {
  const params = useParams<{ code: string }>();
  const { user } = useSession();
  const [results, setResults] = useState<GameResult[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    apiGet<{ session: { name: string }; results: GameResult[] }>(
      `/sessions/${params.code}/results`,
    ).then((res) => {
      if (res.ok) {
        setSessionName(res.data.session.name);
        setResults(res.data.results);
        const mine = res.data.results.find((r) => r.userId === user?.id);
        const won = mine && mine.finalRank === 1;
        if (won && !fired.current) {
          fired.current = true;
          confetti({ particleCount: 160, spread: 90, origin: { y: 0.4 } });
        }
      } else {
        setError(res.error);
      }
    });
  }, [params.code, user?.id]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="font-head text-2xl font-black uppercase text-[--arena-danger]">
          {translateError(error.code, error.status)}
        </p>
        <Link href="/me/sessions" className="mt-4 inline-block underline">
          Retour à mes sessions
        </Link>
      </main>
    );
  }

  const sorted = [...results].sort((a, b) => (a.finalRank ?? 99) - (b.finalRank ?? 99));
  const podium = sorted.slice(0, 3);
  const mine = results.find((r) => r.userId === user?.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-head text-4xl font-black uppercase">Résultats</h1>
      <p className="text-muted-foreground">{sessionName}</p>

      {mine && (
        <Card className="mt-6 border-2 border-[--arena-gold]">
          <CardHeader>
            <CardTitle className="font-head text-2xl uppercase">Ta performance</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Badge variant="outline">Rang {mine.finalRank ?? "—"}</Badge>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Gains</p>
              <AnimatedNumber
                value={mine.prizeWonXaf}
                className="font-head text-3xl font-black text-[--arena-gold]"
              />
              <span className="ml-1 text-sm">XAF</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 grid grid-cols-3 items-end gap-3">
        {podium.map((r, i) => {
          const heights = ["h-24", "h-32", "h-20"];
          const order = i === 0 ? 2 : i === 1 ? 1 : 3;
          return (
            <motion.div
              key={r.userId}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: order * 0.1 }}
              className="flex flex-col items-center"
              style={{ order }}
            >
              <span className="font-head text-2xl font-black">{r.finalRank}</span>
              <div className={`w-full ${heights[i]} border-2 border-border bg-[--arena-gold]/80`} />
              <span className="mt-2 text-xs text-muted-foreground">
{nf.format(r.prizeWonXaf)} XAF
              </span>
            </motion.div>
          );
        })}
      </div>

      <Collapsible className="mt-8 border-2 border-border bg-card">
        <CollapsibleTrigger className="w-full px-4 py-3 text-left font-head font-bold uppercase">
          Détail par round ▾
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <ul className="grid gap-1 text-sm">
            {sorted.map((r) => (
              <li key={r.userId} className="flex justify-between border-b-2 border-border py-1">
                <span>Rang {r.finalRank ?? "—"}</span>
                <span className="font-mono">{nf.format(r.prizeWonXaf)} XAF</span>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>

      <Link href="/me/sessions" className="mt-6 inline-block">
        <Button>Mes sessions</Button>
      </Link>
    </main>
  );
}
