"use client";

import confetti from "canvas-confetti";
import { Crown, RotateCcw, Share2, Trophy } from "lucide-react";
import { PixelAvatar } from "@/components/ui/PixelAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ranking = [
  { name: "Aya M.", points: 2840, rank: 1 },
  { name: "Vous", points: 2610, rank: 2 },
  { name: "Malo K.", points: 2390, rank: 3 },
  { name: "Sam N.", points: 2140, rank: 4 },
];

export function ResultsView() {
  function celebrate() {
    void confetti({ particleCount: 90, spread: 70, origin: { y: 0.72 }, colors: ["#69f58d", "#f1d75b", "#bd88ff", "#effff4"] });
  }
  return <div className="results-layout"><Card className="result-highlight"><CardHeader><Badge>Résultats publiés</Badge><span className="result-trophy"><Trophy /></span><CardTitle className="font-head text-3xl">2e place</CardTitle><CardDescription>Vos scores sont désormais officiels et visibles.</CardDescription></CardHeader><CardContent><strong className="result-points">2 610 <small>PTS</small></strong><div className="wallet-actions"><Button onClick={celebrate}><Crown /> Célébrer</Button><Button variant="outline"><Share2 /> Partager</Button></div></CardContent></Card><Card className="ranking-card"><CardHeader><CardTitle>Classement final</CardTitle><CardDescription>Publication vérifiée par l’administrateur.</CardDescription></CardHeader><CardContent className="ranking-list">{ranking.map((player) => <div className={player.name === "Vous" ? "ranking-row ranking-row--current" : "ranking-row"} key={player.name}><strong>#{player.rank}</strong><PixelAvatar seed={player.name} size="sm" /><span>{player.name}</span><b>{player.points.toLocaleString("fr-FR")}</b></div>)}</CardContent></Card><div className="result-actions"><Button variant="secondary"><RotateCcw /> Rejouer une session</Button></div></div>;
}
