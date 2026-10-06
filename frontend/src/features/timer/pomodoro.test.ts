import { describe, expect, it } from "@jest/globals";
import {
  advance,
  formatClock,
  initialState,
  nextPhaseAfter,
  parseState,
  pause,
  phaseDurationMs,
  remainingMs,
  resetPhase,
  selectPhase,
  serializeState,
  start,
} from "./pomodoro";

const T0 = 1_000_000;
const MINUTE = 60_000;

describe("start / pause", () => {
  it("counts down from the full focus length and stops counting while paused", () => {
    const running = start(initialState(), T0);
    expect(remainingMs(running, T0)).toBe(25 * MINUTE);
    expect(remainingMs(running, T0 + 5 * MINUTE)).toBe(20 * MINUTE);

    const paused = pause(running, T0 + 5 * MINUTE);
    expect(paused.status).toBe("paused");
    expect(remainingMs(paused, T0 + 60 * MINUTE)).toBe(20 * MINUTE);

    const resumed = start(paused, T0 + 60 * MINUTE);
    expect(remainingMs(resumed, T0 + 61 * MINUTE)).toBe(19 * MINUTE);
  });

  it("ignores start when already running and pause when not running", () => {
    const running = start(initialState(), T0);
    expect(start(running, T0 + 1000)).toBe(running);
    const idle = initialState();
    expect(pause(idle, T0)).toBe(idle);
  });

  it("never reports negative time", () => {
    const running = start(initialState(), T0);
    expect(remainingMs(running, T0 + 99 * MINUTE)).toBe(0);
  });
});

describe("advance", () => {
  it("does nothing before the end and finishes the phase at the end", () => {
    const running = start(initialState(), T0);
    expect(advance(running, T0 + 24 * MINUTE).finished).toBeNull();

    const result = advance(running, T0 + 25 * MINUTE);
    expect(result.finished).toBe("focus");
    expect(result.state.status).toBe("idle");
    expect(result.state.phase).toBe("short");
    expect(result.state.completedFocus).toBe(1);
    expect(result.state.remainingMs).toBe(phaseDurationMs("short"));
  });

  it("gives the long break after every fourth focus round, then returns to focus", () => {
    expect(nextPhaseAfter("focus", 1)).toBe("short");
    expect(nextPhaseAfter("focus", 3)).toBe("short");
    expect(nextPhaseAfter("focus", 4)).toBe("long");
    expect(nextPhaseAfter("focus", 8)).toBe("long");
    expect(nextPhaseAfter("short", 4)).toBe("focus");
    expect(nextPhaseAfter("long", 4)).toBe("focus");
  });

  it("does not count a finished break as a focus round", () => {
    const breakRunning = start(selectPhase(initialState(), "short"), T0);
    const result = advance(breakRunning, T0 + 5 * MINUTE);
    expect(result.finished).toBe("short");
    expect(result.state.phase).toBe("focus");
    expect(result.state.completedFocus).toBe(0);
  });
});

describe("selectPhase / resetPhase", () => {
  it("switching phase stops the clock at the new full length and keeps the round counter", () => {
    const running = start({ ...initialState(), completedFocus: 2 }, T0);
    const switched = selectPhase(running, "long");
    expect(switched.status).toBe("idle");
    expect(switched.remainingMs).toBe(15 * MINUTE);
    expect(switched.completedFocus).toBe(2);
  });

  it("reset puts the current phase back to full length", () => {
    const paused = pause(start(initialState(), T0), T0 + 10 * MINUTE);
    expect(resetPhase(paused).remainingMs).toBe(25 * MINUTE);
  });
});

describe("formatClock", () => {
  it("formats mm:ss and rounds partial seconds up so the clock reaches 00:00 only at the end", () => {
    expect(formatClock(25 * MINUTE)).toBe("25:00");
    expect(formatClock(61_000)).toBe("01:01");
    expect(formatClock(999)).toBe("00:01");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(-5)).toBe("00:00");
  });
});

describe("parseState", () => {
  it("round-trips a saved state", () => {
    const running = start(initialState(), T0);
    expect(parseState(serializeState(running), T0 + 1000)).toEqual(running);
  });

  it("falls back to a fresh clock for missing or malformed data", () => {
    expect(parseState(null, T0)).toEqual(initialState());
    expect(parseState("not json", T0)).toEqual(initialState());
    expect(
      parseState(
        JSON.stringify({
          phase: "nap",
          status: "idle",
          remainingMs: 1,
          completedFocus: 0,
          endsAt: null,
        }),
        T0,
      ),
    ).toEqual(initialState());
    expect(
      parseState(
        JSON.stringify({
          phase: "focus",
          status: "idle",
          remainingMs: -1,
          completedFocus: 0,
          endsAt: null,
        }),
        T0,
      ),
    ).toEqual(initialState());
    expect(
      parseState(
        JSON.stringify({
          phase: "focus",
          status: "running",
          remainingMs: 5,
          completedFocus: 0,
          endsAt: null,
        }),
        T0,
      ),
    ).toEqual(initialState());
  });

  it("counts a phase that ran out while the page was closed and waits, stopped, at the next one", () => {
    const running = start(initialState(), T0);
    const restored = parseState(serializeState(running), T0 + 30 * MINUTE);
    expect(restored.status).toBe("idle");
    expect(restored.phase).toBe("short");
    expect(restored.completedFocus).toBe(1);
    expect(restored.remainingMs).toBe(5 * MINUTE);
  });
});
