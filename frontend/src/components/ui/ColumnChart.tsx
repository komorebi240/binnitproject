interface ColumnChartBar {
  label: string;
  value: number;
}

interface ColumnChartProps {
  bars: ColumnChartBar[];
  /** Accessible summary, e.g. "Việc hoàn thành 7 ngày gần đây". */
  ariaLabel: string;
}

/** Small vertical bar chart from plain divs - same no-charting-library rationale as BarChart. */
export function ColumnChart({ bars, ariaLabel }: ColumnChartProps) {
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div role="img" aria-label={ariaLabel} className="flex h-32 items-end gap-2">
      {bars.map((bar) => (
        <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[11px] font-medium text-gray-600">{bar.value}</span>
          <div
            className="gradient-surface w-full max-w-8 rounded-t bg-gradient-to-t from-primary to-primaryEnd transition-all duration-300"
            style={{ height: `${Math.max(bar.value > 0 ? 6 : 2, (bar.value / max) * 80)}%` }}
            title={`${bar.label}: ${bar.value}`}
          />
          <span className="text-[11px] text-gray-400">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}
