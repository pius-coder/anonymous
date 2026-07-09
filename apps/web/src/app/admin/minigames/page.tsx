import type { Metadata } from "next";
import { adminApiGet } from "../admin-api";
import { jsonPreview } from "../admin-format";
import type { MiniGameDefinition } from "../admin-types";
import { MiniGameToggleForm } from "@/components/admin/AdminActionForms";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/retroui/table";

export const metadata: Metadata = {
  title: "Mini-jeux | Admin",
};

const FAMILY_ORDER = ["SOLO", "DUEL", "ALLIANCE", "TEAM", "SURVIVAL", "HIDDEN_ROLE"];

function groupByFamily(games: MiniGameDefinition[]) {
  const groups = new Map<string, MiniGameDefinition[]>();
  for (const game of games) {
    groups.set(game.family, [...(groups.get(game.family) ?? []), game]);
  }
  return FAMILY_ORDER.map((family) => ({ family, games: groups.get(family) ?? [] })).filter(
    (group) => group.games.length > 0,
  );
}

export default async function AdminMiniGamesPage() {
  const result = await adminApiGet<{ definitions: MiniGameDefinition[] }>("/v1/admin/minigames");
  const games = result?.definitions ?? [];
  const familyGroups = groupByFamily(games);

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Catalogue</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Mini-jeux</h1>
        <p className="text-sm text-muted-foreground">
          {games.length} definition(s), {familyGroups.length} section(s).
        </p>
      </div>

      {games.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-muted-foreground">Aucun mini-jeu.</CardContent>
        </Card>
      ) : (
        familyGroups.map((group) => (
          <Card key={group.family}>
            <CardHeader>
              <CardTitle className="font-head text-lg uppercase">
                {group.family} · {group.games.length}/6
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Resolver</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.games.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>
                        <div className="font-medium">{game.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{game.key}</div>
                      </TableCell>
                      <TableCell>{game.playerMode}</TableCell>
                      <TableCell className="font-mono text-xs">{game.resolverId}</TableCell>
                      <TableCell>
                        <Badge variant={game.enabled ? "default" : "outline"}>
                          {game.enabled ? "ACTIVE" : "OFF"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <MiniGameToggleForm game={game} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {games[0] && (
        <Card>
          <CardHeader>
            <CardTitle className="font-head text-lg uppercase">Schema exemple</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-auto rounded border-2 border-border bg-muted p-3 text-xs">
              {jsonPreview(games[0].defaultConfig)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
