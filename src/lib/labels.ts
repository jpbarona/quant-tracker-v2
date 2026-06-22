export const titleCaseLabel = (value: string): string => {
  if (typeof value !== 'string') {
    throw new TypeError('Label value must be a string')
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw new Error('Label value cannot be empty')
  }

  return trimmed
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ')
}

export const safeTitleCaseLabel = (value: string, fallback = 'Unknown'): string => {
  try {
    return titleCaseLabel(value)
  } catch {
    return fallback
  }
}
