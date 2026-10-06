"use client";

import { useEffect, useState } from "react";
import { ArrowCounterClockwise, Pause, Play, Timer } from "@phosphor-icons/react";
import { FloatingWindow } from "@/components/ui/FloatingWindow";
import {
  clampGeometry,
  defaultGeometry,
  parseStoredWindow,
  serializeStoredWindow,
  type WindowGeometry,
  type WindowLimits,
} from "@/lib/floatingWindow";
import { formatClock, PHASE_LABELS, type PomodoroPhase } from "../pomodoro";
import { usePomodoro } from "./PomodoroProvider";

const LIMITS: WindowLimits = { minWidth: 240, minHeight: 230, margin: 8 };
const WINDOW_SIZE = { width: 280, height: 260 };
const STORAGE_PREFIX = "orbit-pomodoro-window:";
const PERSIST_DELAY_MS = 250;
const PHASES: PomodoroPhase[] = ["focus", "short", "long"];

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function openingGeometry(): WindowGeometry {
  return clampGeometry(
    { ...defaultGeometry(0, viewport(), LIMITS), ...WINDOW_SIZE },
    viewport(),
    LIMITS,
  );
}

/** Header button that shows the clock while it runs, and opens the focus-timer window. */
export function PomodoroControl({ userId }: { userId: number }) {
  const pomodoro = usePomodoro();
  const [open, setOpen] = useState(false);
  const [geometry, setGeometry] = useState<WindowGeometry | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const storageKey = `${STORAGE_PREFIX}${userId}`;

  // Restore where the window was last left (clamped to today's screen) the first time it opens.
  useEffect(() => {
    if (!open || geometry) return;
    let stored = null;
    try {
      stored = parseStoredWindow(window.localStorage.getItem(storageKey));
    } catch {
      // Blocked storage: open at the default place.
    }
    setGeometry(
      stored ? clampGeometry({ ...stored.geometry }, viewport(), LIMITS) : openingGeometry(),
    );
    setCollapsed(stored?.collapsed ?? false);
  }, [open, geometry, storageKey]);

  useEffect(() => {
    if (!geometry) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, serializeStoredWindow({ geometry, collapsed }));
      } catch {
        // Nothing else to do if storage is unavailable.
      }
    }, PERSIST_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [geometry, collapsed, storageKey]);

  const { state, remaining } = pomodoro;
  const active = state.status !== "idle";
  const running = state.status === "running";

  return (
    <>
      <button
        type="button"
        title="Đồng hồ tập trung"
        data-tour="timer"
        aria-label={
          active ? `Đồng hồ tập trung, còn ${formatClock(remaining)}` : "Đồng hồ tập trung"
        }
        aria-pressed={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-9 items-center justify-center gap-1.5 rounded px-2 transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
          open ? "bg-surface-muted" : ""
        }`}
      >
        <Timer
          size={20}
          weight={running ? "fill" : "regular"}
          className={running ? "text-primary" : ""}
          aria-hidden
        />
        {active && (
          <span className="font-mono text-xs tabular-nums text-gray-700">
            {formatClock(remaining)}
          </span>
        )}
      </button>

      {open && geometry && (
        <FloatingWindow
          title="Đồng hồ tập trung"
          geometry={geometry}
          collapsed={collapsed}
          limits={LIMITS}
          zIndex={45}
          onGeometryChange={setGeometry}
          onCollapsedChange={setCollapsed}
          onActivate={() => undefined}
          headerActions={
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Đóng cửa sổ (đồng hồ vẫn chạy)"
              aria-label="Đóng cửa sổ đồng hồ"
              className="flex h-6 items-center rounded px-1.5 text-xs text-gray-500 hover:bg-surface-muted hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Đóng
            </button>
          }
        >
          <div className="flex flex-1 flex-col items-center justify-between gap-3 py-1">
            <div className="flex w-full gap-1" role="tablist" aria-label="Chế độ">
              {PHASES.map((phase) => (
                <button
                  key={phase}
                  type="button"
                  role="tab"
                  aria-selected={state.phase === phase}
                  onClick={() => pomodoro.select(phase)}
                  className={`flex-1 rounded px-1 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                    state.phase === phase
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-muted text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {PHASE_LABELS[phase]}
                </button>
              ))}
            </div>

            <p
              className="font-mono text-5xl font-semibold tabular-nums text-gray-900"
              role="timer"
              aria-label={`${PHASE_LABELS[state.phase]}, còn ${formatClock(remaining)}`}
            >
              {formatClock(remaining)}
            </p>

            <div className="flex items-center gap-2">
              {running ? (
                <button
                  type="button"
                  onClick={pomodoro.pause}
                  className="flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Pause size={16} weight="fill" aria-hidden />
                  Tạm dừng
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pomodoro.start}
                  className="flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Play size={16} weight="fill" aria-hidden />
                  {state.status === "paused" ? "Tiếp tục" : "Bắt đầu"}
                </button>
              )}
              <button
                type="button"
                onClick={pomodoro.resetPhase}
                title="Đặt lại chế độ này"
                aria-label="Đặt lại chế độ này"
                className="flex h-9 w-9 items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <ArrowCounterClockwise size={16} aria-hidden />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Đã xong {state.completedFocus} vòng tập trung
              {state.completedFocus > 0 && (
                <button
                  type="button"
                  onClick={pomodoro.resetAll}
                  className="ml-2 underline hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Xoá
                </button>
              )}
            </p>
          </div>
        </FloatingWindow>
      )}
    </>
  );
}
