interface BarChartSegment {
  label: string;
  value: number;
  colorClassName: string;
}

interface BarChartProps {
  segments: BarChartSegment[];
}

/**
 * Design-system primitive (CLAUDE.md section 26) - a single horizontal stacked bar plus a
 * legend, built from plain divs sized by percentage. Deliberately not a charting library: this
 * is the only chart in the app so far and a stacked bar is all it needs (CLAUDE.md section 29 -
 * avoid an unnecessary dependency for one use case). Revisit if a second, more complex chart
 * need shows up.
 */
export function BarChart({ segments }: BarChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <div className="h-3 w-full rounded-full bg-surface-muted" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-muted">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.label}
              className={`h-full transition-all duration-300 ${s.colorClassName}`}
              style={{ width: `${(s.value / total) * 100}%` }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${s.colorClassName}`} />
            {s.label} ({s.value})
          </span>
        ))}
      </div>
    </div>
  );
}
