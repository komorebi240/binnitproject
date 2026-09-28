interface SkeletonProps {
  /** Number of placeholder rows to render, mimicking the shape of a Table while it loads. */
  rows?: number;
}

/**
 * Design-system primitive (CLAUDE.md section 26). Replaces a bare "Đang tải..." string with a
 * shape that hints at the content about to appear — purposeful motion (Tailwind's built-in
 * `animate-pulse`), not decoration (CLAUDE.md section 25).
 */
export function Skeleton({ rows = 3 }: SkeletonProps) {
  return (
    <div className="animate-pulse overflow-hidden rounded border border-gray-200">
      <div className="h-9 bg-surface-muted" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-gray-100 px-4 py-3">
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-4 w-1/4 rounded bg-gray-200" />
          <div className="h-4 w-1/5 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
