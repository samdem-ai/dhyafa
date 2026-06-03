/**
 * Route-level loading skeleton for dashboard pages (inside the shared shell).
 */

export default function DashboardLoading() {
  return (
    <>
      <div className="h-9 w-56 rounded-md bg-surface-sunken animate-pulse" />
      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-card bg-surface shadow-card animate-pulse" />
        ))}
      </div>
      <div className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-md">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 w-full rounded bg-surface-sunken animate-pulse" />
        ))}
      </div>
    </>
  );
}
