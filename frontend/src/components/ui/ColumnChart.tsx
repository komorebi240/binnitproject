"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/motion";

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
  const chartRef = useRef<HTMLDivElement>(null);

  // The columns rise from the baseline one after another when the chart first shows (not under reduced motion).
  useGSAP(
    () => {
      const columns = Array.from(chartRef.current?.querySelectorAll("[data-column]") ?? []);
      if (columns.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(columns, { scaleY: 0, transformOrigin: "bottom center", duration: 0.6, ease: "power3.out", stagger: 0.06, clearProps: "transform" });
      });
      return () => mm.revert();
    },
    { scope: chartRef },
  );

  return (
    <div ref={chartRef} role="img" aria-label={ariaLabel} className="flex h-32 items-end gap-2">
      {bars.map((bar) => (
        <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[11px] font-medium text-fg-soft">{bar.value}</span>
          <div
            data-column
            className="gradient-surface w-full max-w-8 rounded-t bg-gradient-to-t from-primary to-primaryEnd transition-[height] duration-300"
            style={{ height: `${Math.max(bar.value > 0 ? 6 : 2, (bar.value / max) * 80)}%` }}
            title={`${bar.label}: ${bar.value}`}
          />
          <span className="text-[11px] text-fg-faint">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}
