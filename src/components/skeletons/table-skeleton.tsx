export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black overflow-hidden">
      <div className="flex gap-4 px-4 py-3 border-b border-white/[0.06]">
        {Array.from({ length: columns }).map((_, j) => (
          <div key={j} className="h-3 bg-zinc-800 rounded animate-pulse flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-white/[0.04] last:border-0">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-zinc-800/60 rounded animate-pulse flex-1"
              style={{ maxWidth: j === 0 ? '40%' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
