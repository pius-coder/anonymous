import { Skeleton } from "@/components/retroui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/retroui/card";

export function CatalogueGridSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b-2 border-border px-6 py-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex min-h-full flex-col border-2 border-border shadow-lg">
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent className="flex-1 space-y-4">
                <Skeleton className="h-4 w-full" />
                <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-2 w-full" /></div>
              </CardContent>
              <div className="p-6 pt-0"><Skeleton className="h-10 w-full" /></div>
            </Card>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 border-t-2 border-border px-6 py-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
