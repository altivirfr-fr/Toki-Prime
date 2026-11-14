/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats a Date object as YYYY-MM-DD in LOCAL timezone (avoids UTC day-shift bugs after 21:00 BRT).
 */
export function formatLocalDateFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets YYYY-MM-DD in LOCAL timezone with optional day offset.
 */
export function getLocalDateString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatLocalDateFromDate(d);
}
