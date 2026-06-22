import { describe, expect, it } from 'vitest'
import {
  computeActiveElapsedSeconds,
  computePauseIncrementSeconds,
  computeRemainingSeconds,
  formatClock,
} from './timers'

describe('timer calculations', () => {
  it('computes elapsed seconds while running', () => {
    expect(
      computeActiveElapsedSeconds(
        { startedAtMs: 1_000, pausedSeconds: 0, pauseStartedAtMs: null },
        11_000,
      ),
    ).toBe(10)
  })

  it('computes elapsed seconds while paused', () => {
    expect(
      computeActiveElapsedSeconds(
        { startedAtMs: 0, pausedSeconds: 5, pauseStartedAtMs: 20_000 },
        30_000,
      ),
    ).toBe(15)
  })

  it('rejects invalid timer state', () => {
    expect(() =>
      computeActiveElapsedSeconds(
        { startedAtMs: Number.NaN, pausedSeconds: 0, pauseStartedAtMs: null },
        1_000,
      ),
    ).toThrow('Timer start time must be a finite number')
  })

  it('computes remaining seconds', () => {
    expect(
      computeRemainingSeconds(
        60,
        { startedAtMs: 0, pausedSeconds: 0, pauseStartedAtMs: null },
        15_000,
      ),
    ).toBe(45)
  })

  it('computes pause increments', () => {
    expect(computePauseIncrementSeconds(1_000, 4_000)).toBe(3)
  })

  it('formats clock output', () => {
    expect(formatClock(125)).toBe('02:05')
  })
})
