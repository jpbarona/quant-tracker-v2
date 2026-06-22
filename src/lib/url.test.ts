import { describe, expect, it } from 'vitest'
import { assertHttpUrl } from './url'

describe('assertHttpUrl', () => {
  it('returns a trimmed https url', () => {
    expect(assertHttpUrl('  https://quantquestions.io/problems/sample  ')).toBe(
      'https://quantquestions.io/problems/sample',
    )
  })

  it('rejects empty urls', () => {
    expect(() => assertHttpUrl('   ')).toThrow('URL is required')
  })

  it('rejects non-http protocols', () => {
    expect(() => assertHttpUrl('ftp://example.com')).toThrow('URL must use http or https')
  })
})
