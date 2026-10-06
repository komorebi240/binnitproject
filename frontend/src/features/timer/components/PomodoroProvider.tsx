"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  advance,
  initialState,
  parseState,
  pause,
  PHASE_LABELS,
  remainingMs,
  resetAll,
  resetPhase,
  selectPhase,
  serializeState,
  start,
  type PomodoroPhase,
  type PomodoroState,
} from "../pomodoro";

const STORAGE_PREFIX = "orbit-pomodoro:";
const TICK_MS = 250;

interface PomodoroContextValue {
  state: PomodoroState;
  /** Time left right now (re-rendered every tick while running). */
  remaining: number;
  start: () => void;
  pause: () => void;
  resetPhase: () => void;
  resetAll: () => void;
  select: (phase: PomodoroPhase) => void;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

/** A short two-note chime. Audio is a nicety: browsers may block it before the first click, which is fine. */
function chime() {
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.15, context.currentTime + index * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + index * 0.25 + 0.22);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + index * 0.25);
      oscillator.stop(context.currentTime + index * 0.25 + 0.25);
    });
    window.setTimeout(() => void context.close(), 800);
  } catch {
    // Blocked or unsupported audio: the toast still tells the person the phase is over.
  }
}

/**
 * The focus clock lives above the tab workspace, so it keeps running while you change tabs, and it is
 * saved per account (as an end time, not a counter) so a reload does not lose it.
 */
export function PomodoroProvider({
  userId,
  children,
}: {
  userId: number;
  children: React.ReactNode;
}) {
  const { showToast } = useToast();
  const storageKey = `${STORAGE_PREFIX}${userId}`;
  const [state, setState] = useState<PomodoroState>(initialState);
  const [now, setNow] = useState(() => Date.now());
  // Saving must wait until the stored state has been applied, or the first render would overwrite it.
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      setState(parseState(window.localStorage.getItem(storageKey), Date.now()));
    } catch {
      // Blocked storage: start from a fresh clock.
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, serializeState(state));
    } catch {
      // Nothing else to do if storage is unavailable; the clock just will not survive a reload.
    }
  }, [state, hydrated, storageKey]);

  const running = state.status === "running";
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      const result = advance(stateRef.current, current);
      if (result.finished) {
        setState(result.state);
        chime();
        showToast(
          "success",
          `${PHASE_LABELS[result.finished]} xong. Tiếp theo: ${PHASE_LABELS[result.state.phase]}.`,
        );
      }
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [running, showToast]);

  const value = useMemo<PomodoroContextValue>(
    () => ({
      state,
      remaining: remainingMs(state, now),
      start: () => {
        const current = Date.now();
        setNow(current);
        setState((previous) => start(previous, current));
      },
      pause: () => setState((previous) => pause(previous, Date.now())),
      resetPhase: () => setState((previous) => resetPhase(previous)),
      resetAll: () => setState(resetAll()),
      select: (phase) => setState((previous) => selectPhase(previous, phase)),
    }),
    [state, now],
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro(): PomodoroContextValue {
  const context = useContext(PomodoroContext);
  if (!context) throw new Error("usePomodoro must be used within a PomodoroProvider");
  return context;
}
