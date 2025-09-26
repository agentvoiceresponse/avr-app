import { Skeleton } from '@/components/ui/skeleton';

export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="w-[360px] space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-18 w-18 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-4 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
