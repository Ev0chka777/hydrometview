import Skeleton from './Skeleton'

// Skeleton shown while a lazy-loaded route chunk is being fetched.
// Mirrors the typical page silhouette (hero + content cards + grid),
// so the transition doesn't look jarring. Uses the shared <Skeleton />
// shimmer so loading UI is visually consistent across pages.
export default function RouteLoader() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-label="Загрузка раздела"
    >
      <Skeleton className="h-32" />
      <Skeleton className="h-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  )
}
