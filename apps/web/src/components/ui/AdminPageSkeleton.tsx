import { Skeleton } from "@/components/retroui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/retroui/card";

export function AdminKpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
          <CardContent><Skeleton className="h-8 w-16" /></CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b-2 border-border pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AdminPageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-48" />
    </div>
  );
}

export function AdminPageSkeleton({ tableCols = 6, tableRows = 5, kpiCount }: { tableCols?: number; tableRows?: number; kpiCount?: number }) {
  return (
    <div className="space-y-6 p-6">
      <AdminPageHeaderSkeleton />
      {kpiCount && <AdminKpiGridSkeleton count={kpiCount} />}
      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent><AdminTableSkeleton rows={tableRows} cols={tableCols} /></CardContent>
      </Card>
    </div>
  );
}

export function AdminDetailPageSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="space-y-6 p-6">
      <AdminPageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-3 w-16" /></CardHeader>
            <CardContent><Skeleton className="h-6 w-24" /></CardContent>
          </Card>
        ))}
      </div>
      {Array.from({ length: sections }).map((_, i) => (
        <Card key={i}>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CatalogueSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-80" />
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-6 w-24" /><Skeleton className="h-6 w-24" /></div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SessionDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-32" />
          <div className="flex gap-2"><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-24" /></div>
          <Skeleton className="h-16 w-80" />
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-3"><Skeleton className="h-10 w-40" /><Skeleton className="h-10 w-32" /></div>
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.78fr]">
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className={i === 2 ? "md:col-span-2" : ""}>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

export function AdminUserDetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <AdminPageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-3 w-16" /></CardHeader>
            <CardContent><Skeleton className="h-5 w-32" /></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-48" />)}</CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="mt-4 h-12 w-full" /></CardContent></Card>
      </div>
      <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><AdminTableSkeleton rows={3} cols={3} /></CardContent></Card>
    </div>
  );
}
