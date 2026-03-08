export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black p-6 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded w-32 mb-4" />
      <div className={`${height} bg-zinc-800/40 rounded`} />
    </div>
  );
}
