/** Pomodoro clock as plain functions of the state and the current time, so it is easy to test and to restore after a reload. */

export type PomodoroPhase = "focus" | "short" | "long";
export type PomodoroStatus = "idle" | "running" | "paused";

export const PHASE_MINUTES: Record<PomodoroPhase, number> = { focus: 25, short: 5, long: 15 };
export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  focus: "Tập trung",
  short: "Nghỉ ngắn",
  long: "Nghỉ dài",
};
/** Every Nth finished focus round is followed by the long break. */
export const ROUNDS_BEFORE_LONG_BREAK = 4;

export interface PomodoroState {
  phase: PomodoroPhase;
  status: PomodoroStatus;
  /** Epoch ms when a running phase ends; null otherwise. */
  endsAt: number | null;
  /** Time left while idle or paused. */
  remainingMs: number;
  /** Focus rounds finished (resets with the clock). */
  completedFocus: number;
}

export function phaseDurationMs(phase: PomodoroPhase): number {
  return PHASE_MINUTES[phase] * 60_000;
}

export function initialState(): PomodoroState {
  return {
    phase: "focus",
    status: "idle",
    endsAt: null,
    remainingMs: phaseDurationMs("focus"),
    completedFocus: 0,
  };
}

export function remainingMs(state: PomodoroState, now: number): number {
  if (state.status === "running" && state.endsAt !== null) {
    return Math.max(0, state.endsAt - now);
  }
  return state.remainingMs;
}

export function start(state: PomodoroState, now: number): PomodoroState {
  if (state.status === "running") return state;
  return { ...state, status: "running", endsAt: now + state.remainingMs };
}

export function pause(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== "running") return state;
  return { ...state, status: "paused", endsAt: null, remainingMs: remainingMs(state, now) };
}

/** Back to the full length of the current phase, stopped. */
export function resetPhase(state: PomodoroState): PomodoroState {
  return { ...state, status: "idle", endsAt: null, remainingMs: phaseDurationMs(state.phase) };
}

/** Switches to another phase (stopped, full length). The finished-round counter is kept. */
export function selectPhase(state: PomodoroState, phase: PomodoroPhase): PomodoroState {
  return { ...state, phase, status: "idle", endsAt: null, remainingMs: phaseDurationMs(phase) };
}

export function resetAll(): PomodoroState {
  return initialState();
}

export function nextPhaseAfter(phase: PomodoroPhase, completedFocus: number): PomodoroPhase {
  if (phase !== "focus") return "focus";
  return completedFocus % ROUNDS_BEFORE_LONG_BREAK === 0 ? "long" : "short";
}

/**
 * Call on every tick: when a running phase has run out, moves on to the next phase (stopped, so the
 * person decides when to start it) and reports which phase just finished.
 */
export function advance(
  state: PomodoroState,
  now: number,
): { state: PomodoroState; finished: PomodoroPhase | null } {
  if (state.status !== "running" || state.endsAt === null || now < state.endsAt) {
    return { state, finished: null };
  }
  const completedFocus = state.phase === "focus" ? state.completedFocus + 1 : state.completedFocus;
  const next = nextPhaseAfter(state.phase, completedFocus);
  return {
    state: {
      phase: next,
      status: "idle",
      endsAt: null,
      remainingMs: phaseDurationMs(next),
      completedFocus,
    },
    finished: state.phase,
  };
}

/** "24:05" (minutes can exceed 59 only if a phase is ever longer than an hour). */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const PHASES: readonly string[] = ["focus", "short", "long"];
const STATUSES: readonly string[] = ["idle", "running", "paused"];

export function serializeState(state: PomodoroState): string {
  return JSON.stringify(state);
}

/** Restores a saved state; anything malformed gives a fresh clock. */
export function parseState(raw: string | null, now: number): PomodoroState {
  if (!raw) return initialState();
  try {
    const value = JSON.parse(raw) as Partial<PomodoroState>;
    const valid =
      typeof value.phase === "string" &&
      PHASES.includes(value.phase) &&
      typeof value.status === "string" &&
      STATUSES.includes(value.status) &&
      typeof value.remainingMs === "number" &&
      Number.isFinite(value.remainingMs) &&
      value.remainingMs >= 0 &&
      typeof value.completedFocus === "number" &&
      Number.isInteger(value.completedFocus) &&
      value.completedFocus >= 0 &&
      (value.endsAt === null ||
        (typeof value.endsAt === "number" && Number.isFinite(value.endsAt)));
    if (!valid) return initialState();
    const state = value as PomodoroState;
    if (state.status === "running" && state.endsAt !== null && state.endsAt <= now) {
      // Time ran out while nobody was looking: count the finished phase and wait, stopped, at the next one.
      return advance(state, now).state;
    }
    if (state.status === "running" && state.endsAt === null) return initialState();
    return state;
  } catch {
    return initialState();
  }
}
