"use client";

import { THEMES, useTheme, type Theme } from "@/components/theme/ThemeProvider";

const THEME_LABELS: Record<Theme, string> = {
  light: "Sáng",
  dark: "Tối",
  gray: "Xám",
  pink: "Hồng",
};

const THEME_SWATCHES: Record<Theme, string> = {
  light: "bg-white border-gray-300",
  dark: "bg-slate-800 border-slate-600",
  gray: "bg-slate-100 border-slate-400",
  pink: "bg-pink-50 border-pink-300",
};

export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-gray-900">Giao diện</h2>
      <div className="flex flex-wrap gap-3">
        {THEMES.map((option) => {
          const isSelected = option === theme;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setTheme(option)}
              aria-pressed={isSelected}
              className={`flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium transition-all duration-150
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
                ${isSelected ? "border-primary ring-2 ring-primary ring-offset-1" : "border-gray-300 hover:border-gray-400"}`}
            >
              <span className={`h-4 w-4 rounded-full border ${THEME_SWATCHES[option]}`} aria-hidden />
              {THEME_LABELS[option]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
