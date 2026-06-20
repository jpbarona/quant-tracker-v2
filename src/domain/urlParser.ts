const asTitleCase = (slug: string): string => {
  return slug
    .split('-')
    .filter((part) => part.trim().length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ')
}

const safeParseUrl = (value: string): URL | null => {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

export const parseQuestionLabel = (url: string): string => {
  const trimmed = url.trim()
  if (trimmed.length === 0) {
    throw new Error('Question URL is required')
  }

  const parsed = safeParseUrl(trimmed)
  if (!parsed) {
    return trimmed
  }

  const segments = parsed.pathname.split('/').filter((segment) => segment.length > 0)
  if (segments.length === 0) {
    return trimmed
  }

  const lastSegment = segments[segments.length - 1]
  if (!lastSegment) {
    return trimmed
  }

  if (/^[a-z0-9-]+$/i.test(lastSegment) && lastSegment.includes('-')) {
    return asTitleCase(lastSegment)
  }

  return trimmed
}
