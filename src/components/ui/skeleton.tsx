import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}

function SkeletonStat() {
  return (
    <div className="skeleton-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="skeleton skeleton-text w-16" />
          <div className="skeleton skeleton-text-lg" />
          <div className="skeleton skeleton-text w-20" />
        </div>
        <div className="skeleton skeleton-circle w-9 h-9" />
      </div>
    </div>
  );
}

function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-card divide-y divide-border overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="skeleton skeleton-circle w-10 h-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton skeleton-text w-2/3" />
            <div className="skeleton skeleton-text w-1/3" />
          </div>
          <div className="skeleton skeleton-text w-14" />
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="skeleton skeleton-text w-1/3" />
        <div className="skeleton skeleton-text w-16" />
      </div>
      <div className="skeleton skeleton-text w-full" />
      <div className="skeleton skeleton-text w-2/3" />
    </div>
  );
}

export { Skeleton, SkeletonStat, SkeletonList, SkeletonCard };
