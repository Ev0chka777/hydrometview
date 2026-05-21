import clsx from 'clsx'

/**
 * Pure-CSS shimmer skeleton. Replaces "Загрузка…" text placeholders across
 * the app so users get an instant sense of layout instead of an empty box.
 *
 * Uses a custom keyframe in tailwind.config.js (`animate-shimmer`). Falls
 * back to a soft pulse (Tailwind's built-in `animate-pulse`) if you'd
 * rather not extend Tailwind — see the variants below.
 *
 * @param {object} props
 * @param {'rect'|'circle'|'text'} [props.variant='rect']
 * @param {string} [props.className]   — extra Tailwind for size/color.
 * @param {number} [props.lines=1]     — for `variant='text'`, render N stacked lines.
 */
export default function Skeleton({ variant = 'rect', className = '', lines = 1 }) {
  if (variant === 'text') {
    return (
      <span className="block space-y-1.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Bar
            key={i}
            className={clsx(
              'h-3',
              i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full',
              className,
            )}
          />
        ))}
      </span>
    )
  }
  if (variant === 'circle') {
    return <Bar className={clsx('rounded-full', className)} />
  }
  return <Bar className={clsx('rounded-lg', className)} />
}

function Bar({ className }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'block bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200',
        'dark:from-[#1A2540] dark:via-[#22305A] dark:to-[#1A2540]',
        'bg-[length:200%_100%] animate-skeleton-shimmer',
        'transition-colors duration-200',
        className,
      )}
    />
  )
}

/**
 * Compose multiple skeleton bars into a "loading card" — drops in as a
 * direct replacement for a content section while data loads.
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={clsx(
        'rounded-3xl p-5 space-y-4',
        'bg-white dark:bg-[#131E36]/80',
        'border border-slate-200/70 dark:border-white/[0.04]',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-2.5 w-3/5" />
        </div>
      </div>
      <Skeleton variant="text" lines={3} />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </div>
  )
}
