// Friendly dates for the history list: "just now", "5 minutes ago",
// "yesterday", then a normal date for anything older than a week.

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

export function formatRelative(isoDate: string): string {
  const seconds = (new Date(isoDate).getTime() - Date.now()) / 1000 // negative = in the past
  if (Math.abs(seconds) < 60) return 'Just now'
  if (Math.abs(seconds) > 7 * 24 * 60 * 60) return formatDate(isoDate)
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, unitSeconds] of UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      const text = format.format(Math.round(seconds / unitSeconds), unit)
      return text.charAt(0).toUpperCase() + text.slice(1)
    }
  }
  return formatDate(isoDate)
}

// A full date and time in the user's own time zone and format.
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
