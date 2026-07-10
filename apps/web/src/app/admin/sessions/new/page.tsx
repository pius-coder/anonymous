import type { Metadata } from "next";
import { adminApiGet } from "../../admin-api";
import type { MiniGameDefinition } from "../../admin-types";
import { Badge } from "@/components/retroui/badge";
import { CreateSessionForm } from "@/components/admin/CreateSessionForm";

export const metadata: Metadata = {
  title: "Nouvelle session | Admin",
};

export default async function NewAdminSessionPage() {
  const result = await adminApiGet<{ definitions: MiniGameDefinition[] }>("/v1/admin/minigames");
  const miniGames = (result?.definitions ?? []).filter((game) => game.enabled);

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Program Builder</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Nouvelle session</h1>
        <p className="text-sm text-muted-foreground">Creation DRAFT avec validation serveur.</p>
      </div>
      <CreateSessionForm miniGames={miniGames} />
    </div>
  );
}
