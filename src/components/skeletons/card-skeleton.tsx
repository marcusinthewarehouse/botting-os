export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-black p-6 space-y-3 animate-pulse"
        >
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-8 bg-muted/60 rounded w-3/4" />
          <div className="h-3 bg-muted/30 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
