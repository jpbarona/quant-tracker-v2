export const assertHttpUrl = (value: string, label = 'URL'): string => {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a string`)
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw new Error(`${label} is required`)
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error(`${label} is invalid`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${label} must use http or https`)
  }

  return trimmed
}
