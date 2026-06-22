import { describe, expect, it } from 'vitest'
import { validateMentalMathLog } from './mentalMathSession'

describe('validateMentalMathLog', () => {
  it('accepts a valid session', () => {
    expect(() =>
      validateMentalMathLog({
        date: '2026-06-22',
        dayType: 'green',
        scheduledSeconds: 300,
        elapsedSeconds: 280,
        completedFullDuration: false,
        startedAt: '2026-06-22T08:00:00.000Z',
        completedAt: '2026-06-22T08:04:40.000Z',
      }),
    ).not.toThrow()
  })

  it('rejects elapsed time above scheduled duration', () => {
    expect(() =>
      validateMentalMathLog({
        date: '2026-06-22',
        dayType: 'green',
        scheduledSeconds: 300,
        elapsedSeconds: 301,
        completedFullDuration: false,
        startedAt: '2026-06-22T08:00:00.000Z',
        completedAt: '2026-06-22T08:05:01.000Z',
      }),
    ).toThrow('Mental maths elapsed duration cannot exceed the scheduled duration')
  })
})
