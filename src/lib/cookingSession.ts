export interface CookingTimerState {
  stepIndex: number;
  durationSeconds: number;
  endsAt: number;
}

export interface CookingSessionState {
  stepIndex: number;
  timer: CookingTimerState | null;
}

const sessions = new Map<string, CookingSessionState>();

function clampStep(stepIndex: number, stepCount: number) {
  if (stepCount <= 0) return 0;
  return Math.max(0, Math.min(Math.floor(stepIndex), stepCount - 1));
}

export function readCookingSession(recipeId: string, stepCount: number): CookingSessionState {
  const current = sessions.get(recipeId);
  if (!current) return { stepIndex: 0, timer: null };
  return {
    stepIndex: clampStep(current.stepIndex, stepCount),
    timer: current.timer,
  };
}

export function saveCookingStep(recipeId: string, stepIndex: number, stepCount: number) {
  const current = readCookingSession(recipeId, stepCount);
  const next = { ...current, stepIndex: clampStep(stepIndex, stepCount) };
  sessions.set(recipeId, next);
  return next;
}

export function startCookingTimer(
  recipeId: string,
  stepIndex: number,
  durationSeconds: number,
  stepCount: number,
  now = Date.now()
) {
  const seconds = Math.max(1, Math.round(durationSeconds));
  const current = readCookingSession(recipeId, stepCount);
  const timer: CookingTimerState = {
    stepIndex: clampStep(stepIndex, stepCount),
    durationSeconds: seconds,
    endsAt: now + seconds * 1000,
  };
  sessions.set(recipeId, { ...current, timer });
  return timer;
}

export function cancelCookingTimer(recipeId: string, stepCount: number) {
  const current = readCookingSession(recipeId, stepCount);
  sessions.set(recipeId, { ...current, timer: null });
}

export function clearCookingSession(recipeId: string) {
  sessions.delete(recipeId);
}

export function remainingTimerSeconds(timer: CookingTimerState, now = Date.now()) {
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

export function suggestedTimerSeconds(step: string): number | null {
  const match = step.match(/(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2].toLowerCase();
  const multiplier = unit.startsWith("hour") || unit.startsWith("hr")
    ? 3600
    : unit.startsWith("second") || unit.startsWith("sec")
      ? 1
      : 60;
  return Math.min(12 * 60 * 60, Math.max(1, Math.round(amount * multiplier)));
}

export function formatCookingTimer(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
