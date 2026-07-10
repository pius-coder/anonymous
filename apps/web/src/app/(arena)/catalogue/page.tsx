import type { Metadata } from "next";
import { CatalogueGrid } from "@/components/public";

export const metadata: Metadata = {
  title: "Catalogue des Sessions | Session Jeu",
  description: "Découvrez les sessions de compétitions stratégiques disponibles.",
};

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const resolved = await searchParams;
  const page = Number(resolved.page) || 1;
  const filter = resolved.filter ?? "all";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <CatalogueGrid page={page} filter={filter} />
    </div>
  );
}
