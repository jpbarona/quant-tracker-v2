export interface PausedTimerClock {
  startedAtMs: number
  pausedSeconds: number
  pauseStartedAtMs: number | null
}

const assertEpochMs = (value: number, label: string): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
}

const assertNonNegativeSeconds = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`)
  }
}

export const assertPausedTimerClock = (timer: PausedTimerClock): void => {
  assertEpochMs(timer.startedAtMs, 'Timer start time')
  assertNonNegativeSeconds(timer.pausedSeconds, 'Paused duration')
  if (timer.pauseStartedAtMs !== null) {
    assertEpochMs(timer.pauseStartedAtMs, 'Pause start time')
    if (timer.pauseStartedAtMs < timer.startedAtMs) {
      throw new Error('Pause start time cannot be before timer start time')
    }
  }
}

export const computeActiveElapsedSeconds = (timer: PausedTimerClock, nowEpochMs: number): number => {
  assertPausedTimerClock(timer)
  assertEpochMs(nowEpochMs, 'Current time')
  const endMs = timer.pauseStartedAtMs ?? nowEpochMs
  const gross = Math.floor((endMs - timer.startedAtMs) / 1000)
  return Math.max(0, gross - timer.pausedSeconds)
}

export const computeRemainingSeconds = (
  scheduledSeconds: number,
  timer: PausedTimerClock,
  nowEpochMs: number,
): number => {
  assertNonNegativeSeconds(scheduledSeconds, 'Scheduled duration')
  const elapsed = computeActiveElapsedSeconds(timer, nowEpochMs)
  return Math.max(0, scheduledSeconds - elapsed)
}

export const computePauseIncrementSeconds = (pauseStartedAtMs: number, nowEpochMs: number): number => {
  assertEpochMs(pauseStartedAtMs, 'Pause start time')
  assertEpochMs(nowEpochMs, 'Current time')
  if (nowEpochMs < pauseStartedAtMs) {
    throw new Error('Current time cannot be before pause start time')
  }
  return Math.floor((nowEpochMs - pauseStartedAtMs) / 1000)
}

export const formatClock = (totalSeconds: number): string => {
  if (!Number.isFinite(totalSeconds)) {
    throw new Error('Clock duration must be a finite number')
  }
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0')
  const seconds = String(safe % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}
