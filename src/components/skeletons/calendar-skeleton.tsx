export function CalendarSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-black p-4 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-muted rounded w-32" />
        <div className="flex gap-2">
          <div className="size-8 bg-muted rounded" />
          <div className="size-8 bg-muted rounded" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`h-${i}`} className="h-4 bg-muted/40 rounded mb-2" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted/20 rounded" />
        ))}
      </div>
    </div>
  );
}
