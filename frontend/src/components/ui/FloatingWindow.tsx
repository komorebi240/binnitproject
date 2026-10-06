"use client";

import { useEffect, useRef } from "react";
import { CaretUp, DotsSixVertical, Minus } from "@phosphor-icons/react";
import {
  clampGeometry,
  resizeGeometry,
  type ResizeEdge,
  type ViewportSize,
  type WindowGeometry,
  type WindowLimits,
} from "@/lib/floatingWindow";

interface FloatingWindowProps {
  /** Shown in the title bar, which is also the drag handle. */
  title: string;
  geometry: WindowGeometry;
  collapsed: boolean;
  limits: WindowLimits;
  zIndex: number;
  onGeometryChange: (geometry: WindowGeometry) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  /** Called on any pointer-down inside the window, so the owner can bring it to the front. */
  onActivate: () => void;
  /** Extra title-bar buttons (e.g. unpin), rendered after the collapse button. */
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

type Interaction = { kind: "move" } | { kind: "resize"; edge: ResizeEdge };

interface ActiveInteraction {
  interaction: Interaction;
  startX: number;
  startY: number;
  start: WindowGeometry;
}

const KEY_STEP = 16;
const ARROW_DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Thin invisible hit areas along the edges and corners; only the bottom-right one draws a grip. */
const RESIZE_HANDLES: { edge: ResizeEdge; className: string }[] = [
  { edge: "n", className: "-top-1 left-3 right-3 h-2 cursor-ns-resize" },
  { edge: "s", className: "-bottom-1 left-3 right-3 h-2 cursor-ns-resize" },
  { edge: "w", className: "-left-1 top-3 bottom-3 w-2 cursor-ew-resize" },
  { edge: "e", className: "-right-1 top-3 bottom-3 w-2 cursor-ew-resize" },
  { edge: "nw", className: "-left-1 -top-1 h-4 w-4 cursor-nwse-resize" },
  { edge: "ne", className: "-right-1 -top-1 h-4 w-4 cursor-nesw-resize" },
  { edge: "sw", className: "-bottom-1 -left-1 h-4 w-4 cursor-nesw-resize" },
  { edge: "se", className: "-bottom-1 -right-1 h-5 w-5 cursor-nwse-resize" },
];

function viewportSize(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * A window that floats above the page: drag it by the title bar, resize it from any edge or corner,
 * collapse it to the title bar. Geometry is owned by the parent (so it can also change it, e.g.
 * auto-growing with its content); this component only turns pointer/keyboard input into geometry and
 * guarantees it never leaves the screen - including when the browser window itself shrinks.
 * Keyboard: with the title bar focused, arrows move it and Shift+arrows resize it.
 */
export function FloatingWindow({
  title,
  geometry,
  collapsed,
  limits,
  zIndex,
  onGeometryChange,
  onCollapsedChange,
  onActivate,
  headerActions,
  children,
}: FloatingWindowProps) {
  const activeRef = useRef<ActiveInteraction | null>(null);
  const geometryRef = useRef(geometry);
  geometryRef.current = geometry;

  // Keep the window on screen when the browser window is resized.
  useEffect(() => {
    function handleResize() {
      const clamped = clampGeometry(geometryRef.current, viewportSize(), limits);
      const current = geometryRef.current;
      if (
        clamped.x !== current.x ||
        clamped.y !== current.y ||
        clamped.width !== current.width ||
        clamped.height !== current.height
      ) {
        onGeometryChange(clamped);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [limits, onGeometryChange]);

  function begin(interaction: Interaction, event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activeRef.current = {
      interaction,
      startX: event.clientX,
      startY: event.clientY,
      start: geometryRef.current,
    };
  }

  function handleMove(event: React.PointerEvent<HTMLElement>) {
    const active = activeRef.current;
    if (!active) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    const viewport = viewportSize();
    onGeometryChange(
      active.interaction.kind === "move"
        ? clampGeometry(
            { ...active.start, x: active.start.x + dx, y: active.start.y + dy },
            viewport,
            limits,
          )
        : resizeGeometry(active.start, active.interaction.edge, dx, dy, viewport, limits),
    );
  }

  function end() {
    activeRef.current = null;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    const direction = ARROW_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    const [sx, sy] = direction;
    const viewport = viewportSize();
    const current = geometryRef.current;
    onGeometryChange(
      event.shiftKey
        ? resizeGeometry(current, "se", sx * KEY_STEP, sy * KEY_STEP, viewport, limits)
        : clampGeometry(
            { ...current, x: current.x + sx * KEY_STEP, y: current.y + sy * KEY_STEP },
            viewport,
            limits,
          ),
    );
  }

  const pointerHandlers = (interaction: Interaction) => ({
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => begin(interaction, event),
    onPointerMove: handleMove,
    onPointerUp: end,
    onPointerCancel: end,
  });

  return (
    <div
      role="dialog"
      aria-label={title}
      onPointerDownCapture={onActivate}
      className="animate-fade-in fixed flex flex-col rounded-lg border border-gray-200 bg-white shadow-xl"
      style={{
        left: geometry.x,
        top: geometry.y,
        width: geometry.width,
        height: collapsed ? undefined : geometry.height,
        zIndex,
      }}
    >
      <div className="flex items-center gap-1 border-b border-gray-100 px-2 py-1.5">
        <div
          role="button"
          tabIndex={0}
          aria-label={`Di chuyển cửa sổ "${title}" (phím mũi tên; giữ Shift để đổi cỡ)`}
          title="Kéo để di chuyển"
          onKeyDown={handleKeyDown}
          {...pointerHandlers({ kind: "move" })}
          className="flex min-w-0 flex-1 cursor-grab touch-none select-none items-center gap-1 rounded active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <DotsSixVertical size={16} className="shrink-0 text-gray-400" aria-hidden />
          <span className="truncate text-sm font-semibold text-gray-900">{title}</span>
        </div>
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          title={collapsed ? "Mở ra" : "Thu gọn"}
          aria-label={collapsed ? "Mở ra" : "Thu gọn"}
          aria-expanded={!collapsed}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-surface-muted hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {collapsed ? <CaretUp size={14} aria-hidden /> : <Minus size={14} aria-hidden />}
        </button>
        {headerActions}
      </div>

      <div className={collapsed ? "hidden" : "flex min-h-0 flex-1 flex-col p-2"}>{children}</div>

      {!collapsed &&
        RESIZE_HANDLES.map(({ edge, className }) => (
          <div
            key={edge}
            aria-hidden
            {...pointerHandlers({ kind: "resize", edge })}
            className={`absolute touch-none ${className}`}
          >
            {edge === "se" && (
              <svg
                className="pointer-events-none absolute bottom-1.5 right-1.5 text-gray-400"
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              >
                <path d="M9 1L1 9M9 5L5 9" />
              </svg>
            )}
          </div>
        ))}
    </div>
  );
}
