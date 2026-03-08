export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex gap-4 px-4 py-3 border-b border-border">
        {Array.from({ length: columns }).map((_, j) => (
          <div key={j} className="h-3 bg-muted rounded animate-pulse flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 px-4 py-3 border-b border-border last:border-0"
        >
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-muted/60 rounded animate-pulse flex-1"
              style={{ maxWidth: j === 0 ? "40%" : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
