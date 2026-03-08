export function FeedSkeleton({ messages = 6 }: { messages?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: messages }).map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="size-8 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-3 bg-muted rounded w-20" />
              <div className="h-3 bg-muted/40 rounded w-12" />
            </div>
            <div className="h-4 bg-muted/60 rounded w-full max-w-xs" />
          </div>
        </div>
      ))}
    </div>
  );
}
