/** Formats a Date as YYYY-MM-DD using local (not UTC) calendar fields, so a
 * sale made shortly after local midnight isn't attributed to the wrong day
 * (Malaysia is UTC+8; naive UTC-date slicing would get this wrong). */
export function toLocalDateString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayLocalDateString(): string {
  return toLocalDateString(new Date())
}

export function daysAgoLocalDateString(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toLocalDateString(date)
}
