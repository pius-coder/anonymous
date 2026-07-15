import { Boxes, Code2, MoreHorizontal, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uiMiniGames } from "@/lib/ui-data";

export default function MiniGamesPage() {
  return <AppShell audience="Admin" eyebrow="Catalogue runtime" title="Mini-jeux" subtitle="Manifestes, versions, familles et politiques anti-triche." actions={<Button><Plus /> Ajouter un manifeste</Button>}>
    <div className="minigame-grid">{uiMiniGames.map((game) => <Card key={game.id} className="minigame-card"><CardHeader><div className={`minigame-glyph minigame-glyph--${game.color}`}><Boxes /></div><CardTitle>{game.name}</CardTitle><CardDescription>{game.id}</CardDescription></CardHeader><CardContent><div className="minigame-tags"><Badge variant="outline">{game.family}</Badge><Badge variant="outline">v{game.version}</Badge><Badge>{game.status}</Badge></div><div className="minigame-rule"><Code2 /><span><small>Resolver</small><strong>{game.id}.resolver</strong></span></div><div className="minigame-rule"><ShieldCheck /><span><small>Politique</small><strong>Server authoritative</strong></span></div><Button variant="outline" className="mt-3 w-full">Configurer <MoreHorizontal /></Button></CardContent></Card>)}</div>
  </AppShell>;
}
