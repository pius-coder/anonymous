import { Suspense } from "react";
import { CatalogueGridContent } from "@/components/public/CatalogueGridContent";
import { CatalogueGridSkeleton } from "@/components/public/CatalogueGridSkeleton";

export function CatalogueGrid({ page, filter }: { page: number; filter: string }) {
  return (
    <Suspense fallback={<CatalogueGridSkeleton />}>
      <CatalogueGridContent page={page} filter={filter} />
    </Suspense>
  );
}
