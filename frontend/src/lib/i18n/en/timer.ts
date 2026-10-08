import type { timer as vi } from "../vi/timer";

export const timer: Record<keyof typeof vi, string> = {
  "timer.pomodoro.focus": "Focus",
  "timer.pomodoro.longBreak": "Long break",
  "timer.pomodoro.shortBreak": "Short break",
  "timer.pomodoroControl.closeTimerWindow": "Close timer window",
  "timer.pomodoroControl.closeWindowTheTimerKeepsRunning": "Close window (the timer keeps running)",
  "timer.pomodoroControl.focusRoundsDone_one": "{count} focus round done",
  "timer.pomodoroControl.focusRoundsDone_other": "{count} focus rounds done",
  "timer.pomodoroControl.focusTimerVLeft": "Focus timer, {v} left",
  "timer.pomodoroControl.mode": "Mode",
  "timer.pomodoroControl.pause": "Pause",
  "timer.pomodoroControl.resetThisMode": "Reset this mode",
  "timer.pomodoroControl.vV2Left": "{v}, {v2} left",
  "timer.pomodoroProvider.vFinishedNextV2": "{v} finished. Next: {v2}.",
};
