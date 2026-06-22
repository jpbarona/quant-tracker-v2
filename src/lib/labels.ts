export const titleCaseLabel = (value: string): string => {
  return value
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ')
}
