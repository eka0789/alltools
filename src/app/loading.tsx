export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-muted/60" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-muted/40" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-44 animate-pulse bg-muted/30" />
        ))}
      </div>
    </div>
  );
}
