// Skeleton shown while a route's code loads.
export default function PageLoader({ cards = 6 }) {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-5 px-4 py-6 sm:px-6">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-lg bg-zinc-200/80" />
        <div className="h-4 w-80 max-w-full rounded-md bg-zinc-200/60" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-zinc-200/60" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="h-40 rounded-xl bg-zinc-200/50" />
        ))}
      </div>
    </div>
  );
}
