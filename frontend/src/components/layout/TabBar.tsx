"use client";

import { useEffect, useRef, useState } from "react";
import { Columns, Plus, X } from "@phosphor-icons/react";
import { useTabs, type Tab } from "./TabsContext";
import { applySubsetOrder, reorder } from "@/lib/tabDrag";
import { prefersReducedMotion, useGSAP } from "@/lib/motion";
import { Flip } from "@/lib/motionFlip";
import { sideOf } from "@/lib/tabSplit";
import { describeTab } from "./tabMeta";
import { useTabDrag, type DragView, type StripId } from "./useTabDrag";

type ChipState = "focused" | "partner" | "idle";

const CHIP_STATE_CLASSES: Record<ChipState, string> = {
  focused: "border-line bg-surface text-fg",
  partner: "border-line bg-surface/60 text-fg-soft",
  idle: "border-transparent text-fg-muted hover:bg-white/60",
};

type ChipMotion = "enter" | "exit" | undefined;

// Keep in step with the tab-slide-in / tab-slide-out durations in tailwind.config.ts.
const ENTER_MS = 320;
const EXIT_MS = 240;

const CHIP_MOTION_CLASSES: Record<NonNullable<ChipMotion>, string> = {
  enter: "animate-tab-slide-in overflow-hidden",
  exit: "animate-tab-slide-out pointer-events-none overflow-hidden",
};

/**
 * Drives the slide animations: a chip whose tab was not there on the previous render slides in (the
 * first render and re-mounts, e.g. toggling split screen, do not animate), and closing plays the slide
 * out first and removes the tab only when it has finished. Reduced-motion users get the instant close.
 */
function useTabMotion(tabs: Tab[], closeTab: (id: string) => void) {
  const knownRef = useRef<Set<string> | null>(null);
  const enteringUntilRef = useRef(new Map<string, number>());
  const [closing, setClosing] = useState<ReadonlySet<string>>(new Set());

  if (knownRef.current === null) {
    knownRef.current = new Set(tabs.map((t) => t.id));
  } else {
    for (const tab of tabs) {
      if (!knownRef.current.has(tab.id)) {
        knownRef.current.add(tab.id);
        enteringUntilRef.current.set(tab.id, Date.now() + ENTER_MS);
      }
    }
  }

  function motionOf(id: string): ChipMotion {
    if (closing.has(id)) return "exit";
    return (enteringUntilRef.current.get(id) ?? 0) > Date.now() ? "enter" : undefined;
  }

  function requestClose(id: string) {
    if (closing.has(id)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      closeTab(id);
      return;
    }
    setClosing((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      closeTab(id);
      setClosing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, EXIT_MS);
  }

  return { motionOf, requestClose };
}

/** Everything TabBar gets from useTabDrag for one chip. */
interface ChipDrag {
  chipRef: (el: HTMLElement | null) => void;
  handlers: Pick<
    React.HTMLAttributes<HTMLElement>,
    "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onLostPointerCapture"
  >;
  style: React.CSSProperties | undefined;
}

function TabChip({
  tab,
  state,
  motion,
  canClose,
  drag,
  onSelect,
  onClose,
}: {
  tab: Tab;
  state: ChipState;
  motion: ChipMotion;
  canClose: boolean;
  drag: ChipDrag;
  onSelect: () => void;
  onClose: () => void;
}) {
  const { label, icon: TabIcon } = describeTab(tab.path);
  return (
    <div
      ref={drag.chipRef}
      data-tab-chip
      style={drag.style}
      {...drag.handlers}
      className={`group flex max-w-[180px] shrink-0 select-none items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-2 text-sm transition-[transform,color,background-color,border-color] duration-150 ${motion ? CHIP_MOTION_CLASSES[motion] : ""} ${CHIP_STATE_CLASSES[state]}`}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-1.5">
        <TabIcon size={14} aria-hidden className="shrink-0" />
        <span className="truncate">{label}</span>
      </button>
      {canClose && (
        <button
          type="button"
          onClick={onClose}
          data-no-drag
          aria-label={`Đóng tab ${label}`}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-fg-faint opacity-0 transition-opacity duration-150 hover:bg-line hover:text-fg-soft focus-visible:opacity-100 group-hover:opacity-100"
        >
          <X size={11} weight="bold" aria-hidden />
        </button>
      )}
    </div>
  );
}

const GHOST_LIFT = "scale(1.06) rotate(-1.5deg)";

/** The chip while it is being dragged: lifts off the bar (always drawn solid, even for a background tab), follows the pointer, glides home on release. */
function FloatingChip({ view, tab }: { view: DragView; tab: Tab }) {
  const { label, icon: TabIcon } = describeTab(tab.path);
  const [lifted, setLifted] = useState(false);
  useEffect(() => {
    // One frame at rest first, so the lift animates instead of starting already tilted.
    const frame = requestAnimationFrame(() => setLifted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed z-[60] flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-2 text-sm shadow-xl ${CHIP_STATE_CLASSES.focused}`}
      style={{
        left: view.left,
        top: view.top,
        width: view.width,
        height: view.height,
        transform: lifted && !view.settling ? GHOST_LIFT : "none",
        transition: view.settling
          ? "left 180ms cubic-bezier(0.22, 1, 0.36, 1), top 180ms cubic-bezier(0.22, 1, 0.36, 1), transform 180ms ease-out"
          : "transform 150ms ease-out",
      }}
    >
      <TabIcon size={14} aria-hidden className="shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function NewTabButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Mở tab mới"
      aria-label="Mở tab mới"
      className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center self-center rounded text-fg-muted transition-colors duration-150 hover:bg-white/60 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Plus size={16} aria-hidden />
    </button>
  );
}

function SplitToggle({ split, onClick }: { split: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={split ? "Tắt chia đôi màn hình" : "Chia đôi màn hình"}
      aria-label={split ? "Tắt chia đôi màn hình" : "Chia đôi màn hình"}
      aria-pressed={split}
      data-tour="split-screen"
      className={`mb-0.5 ml-auto hidden h-7 shrink-0 items-center gap-1.5 self-center rounded px-2 text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:flex ${
        split ? "bg-primary/10 text-primary-text" : "text-fg-muted hover:bg-white/60 hover:text-fg"
      }`}
    >
      <Columns size={16} aria-hidden />
      {split ? "Bỏ chia đôi" : "Chia đôi"}
    </button>
  );
}

/**
 * The "taskbar" of open tabs (user's own term) - a Chrome-style strip, not the Sidebar. Each tab
 * is its own independent page kept alive in the DOM by TabContentRenderer; clicking one just
 * switches which is visible, never a real navigation/reload. "+" always opens a fresh tab to
 * Home, per the user's explicit spec ("mỗi lần thêm tab sẽ mở ra một cửa sổ home").
 *
 * In split-screen the bar splits too: each half sits exactly above its pane and shows that pane's
 * half's own tabs (every tab belongs to exactly one half; dragging a chip into the other strip moves it);
 * picking one shows it in THIS pane, "+" opens a new Home tab in that half, and the split toggle stays at the far right.
 */
export function TabBar() {
  const {
    tabs,
    activeTabId,
    splitTabId,
    panes,
    splitRatio,
    selectTab,
    selectTabInPane,
    openNewTabInPane,
    closeTab,
    openNewTab,
    toggleSplit,
    reorderTabs,
    moveTabToPane,
  } = useTabs();
  // When a tab closes, the chips after it slide into the gap (GSAP Flip) instead of jumping. Drags have
  // their own gliding in useTabDrag, so only closing is handled here. There is one tab bar on screen.
  const closedLayoutRef = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const { motionOf, requestClose } = useTabMotion(tabs, (id) => {
    closedLayoutRef.current = Flip.getState("[data-tab-chip]");
    closeTab(id);
  });
  const tabsSignature = tabs.map((t) => t.id).join(",");
  useGSAP(
    () => {
      const before = closedLayoutRef.current;
      closedLayoutRef.current = null;
      if (!before) return;
      if (prefersReducedMotion()) return;
      Flip.from(before, { targets: "[data-tab-chip]", duration: 0.25, ease: "power2.out" });
    },
    { dependencies: [tabsSignature] },
  );
  const barClassName = "glass-bar flex items-stretch border-b";

  const allIds = tabs.map((t) => t.id);

  /** The tabs a strip lists: the ones that belong to its half, in the shared tab order (a tab never shows in both halves). */
  function stripIdsFor(strip: StripId): string[] {
    if (!panes || strip === "single") return allIds;
    return tabs.filter((t) => sideOf(t) === strip).map((t) => t.id);
  }

  const dnd = useTabDrag({
    items: panes ? { left: stripIdsFor("left"), right: stripIdsFor("right") } : { single: allIds },
    onReorder: (strip, from, to) => {
      const ids = stripIdsFor(strip);
      reorderTabs(applySubsetOrder(allIds, ids, reorder(ids, from, to)));
    },
    onMoveToStrip: (id, strip) => {
      if (panes && strip !== "single")
        moveTabToPane(id, strip === "left" ? panes.leftId : panes.rightId);
    },
  });

  /** Drag wiring for the chip of tab `id` in `strip`; `index` is its slot among the strip's reorderable chips (-1: none). */
  function dragProps(strip: StripId, id: string, index: number): ChipDrag {
    return {
      chipRef: dnd.registerChip(id),
      handlers: dnd.handlers(strip, id),
      style: dnd.chipStyle(strip, id, index),
    };
  }

  /** Select handler that ignores the click which ends a drag. */
  function guarded(action: () => void) {
    return () => {
      if (!dnd.shouldIgnoreClick()) action();
    };
  }

  const draggedTab = dnd.drag ? tabs.find((t) => t.id === dnd.drag?.id) : undefined;
  const ghost = dnd.drag && draggedTab ? <FloatingChip view={dnd.drag} tab={draggedTab} /> : null;

  if (!panes) {
    return (
      <div
        ref={dnd.registerStrip("single")}
        className={`${barClassName} gap-1 overflow-x-auto px-2 pt-2`}
      >
        {tabs.map((tab, index) => (
          <TabChip
            key={tab.id}
            tab={tab}
            state={tab.id === activeTabId ? "focused" : "idle"}
            motion={motionOf(tab.id)}
            canClose={tabs.length > 1}
            drag={dragProps("single", tab.id, index)}
            onSelect={guarded(() => selectTab(tab.id))}
            onClose={() => requestClose(tab.id)}
          />
        ))}
        <NewTabButton onClick={openNewTab} />
        <SplitToggle split={false} onClick={toggleSplit} />
        {ghost}
      </div>
    );
  }

  const paneStrips: { id: string; strip: StripId }[] = [
    { id: panes.leftId, strip: "left" },
    { id: panes.rightId, strip: "right" },
  ];

  return (
    <div
      className={barClassName}
      style={{ "--split-left": `${splitRatio * 100}%` } as React.CSSProperties}
    >
      {paneStrips.map(({ id: paneId, strip }) => {
        if (!tabs.some((t) => t.id === paneId)) return null;
        const isFocused = paneId === activeTabId;
        const isRight = strip === "right";
        const dropTarget = dnd.drag?.overStrip === strip && dnd.drag.strip !== strip;
        return (
          <div
            key={paneId}
            ref={dnd.registerStrip(strip)}
            // Below md only the focused pane is shown, so only its strip is too.
            className={`min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 pt-2 transition-colors duration-150 ${isRight ? "md:flex-1 md:basis-0" : "md:flex-none md:basis-[var(--split-left)]"} ${isFocused ? "flex" : "hidden md:flex"} ${
              isRight ? "" : "md:border-r md:border-line"
            } ${dropTarget ? "bg-primary/10 ring-2 ring-inset ring-primary/40" : ""}`}
          >
            {stripIdsFor(strip).map((id, index) => {
              const tab = tabs.find((t) => t.id === id);
              if (!tab) return null;
              const isOwn = id === paneId;
              return (
                <TabChip
                  key={tab.id}
                  tab={tab}
                  state={isOwn ? (isFocused ? "focused" : "partner") : "idle"}
                  motion={motionOf(tab.id)}
                  canClose={tabs.length > 1}
                  drag={dragProps(strip, tab.id, index)}
                  onSelect={guarded(() =>
                    isOwn ? selectTab(paneId) : selectTabInPane(paneId, tab.id),
                  )}
                  onClose={() => requestClose(tab.id)}
                />
              );
            })}
            <NewTabButton onClick={() => openNewTabInPane(paneId)} />
            {isRight && splitTabId && <SplitToggle split onClick={toggleSplit} />}
          </div>
        );
      })}
      {ghost}
    </div>
  );
}
