export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-32 mb-4" />
      <div className={`${height} bg-muted/40 rounded`} />
    </div>
  );
}
