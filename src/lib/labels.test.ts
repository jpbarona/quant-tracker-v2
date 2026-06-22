import { describe, expect, it } from 'vitest'
import { safeTitleCaseLabel, titleCaseLabel } from './labels'

describe('titleCaseLabel', () => {
  it('formats snake_case labels', () => {
    expect(titleCaseLabel('interview_prep')).toBe('Interview Prep')
  })

  it('rejects empty values', () => {
    expect(() => titleCaseLabel('   ')).toThrow('Label value cannot be empty')
  })

  it('rejects non-string values', () => {
    expect(() => titleCaseLabel(null as unknown as string)).toThrow('Label value must be a string')
  })
})

describe('safeTitleCaseLabel', () => {
  it('returns fallback when label is invalid', () => {
    expect(safeTitleCaseLabel('')).toBe('Unknown')
    expect(safeTitleCaseLabel('green')).toBe('Green')
  })
})
