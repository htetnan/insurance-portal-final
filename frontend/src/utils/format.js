/**
 * Shared formatting utilities — use these instead of inline date/currency formatting.
 *
 * Usage:
 *   import { fmtDate, fmtDateTime, fmtCurrency, fmtNumber } from '../utils/format'
 */

/**
 * Format a date string or Date object as "DD MMM YYYY" (e.g. "01 Jan 2025").
 * Returns "—" for null/undefined.
 */
export function fmtDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return String(value)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Format a date-time string as "DD MMM YYYY, HH:mm" (e.g. "01 Jan 2025, 14:30").
 * Returns "—" for null/undefined.
 */
export function fmtDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return String(value)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format a number as MMK currency (e.g. "1,200,000 MMK").
 * Returns "—" for null/undefined.
 */
export function fmtCurrency(value) {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (isNaN(num)) return String(value)
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' MMK'
}

/**
 * Format a number as a plain, comma-separated integer (e.g. 1200000 → "1,200,000").
 */
export function fmtNumber(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('en-US')
}
