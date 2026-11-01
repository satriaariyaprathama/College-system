import {
  format,
  parseISO,
  startOfWeek as dfStartOfWeek,
  endOfWeek as dfEndOfWeek,
  startOfMonth as dfStartOfMonth,
  startOfDay as dfStartOfDay,
  isBefore,
  isValid,
} from "date-fns";
import { id } from "date-fns/locale";

/**
 * Safely parse a Date or ISO date string into a Date object.
 */
export function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;
  return new Date(value);
}

/**
 * Returns the Date object representing Monday (00:00:00) of the week.
 */
export function getStartOfWeek(date: Date | string = new Date()): Date {
  return dfStartOfWeek(toDate(date), { weekStartsOn: 1 });
}

/**
 * Returns the Date object representing the end of the week (Sunday 23:59:59).
 */
export function getEndOfWeek(date: Date | string = new Date()): Date {
  return dfEndOfWeek(toDate(date), { weekStartsOn: 1 });
}

/**
 * Formats a Date or ISO string into a local 'yyyy-MM-dd' string.
 */
export function formatLocalDateKey(date: Date | string = new Date()): string {
  return format(toDate(date), "yyyy-MM-dd");
}

/**
 * Returns 'yyyy-MM-01' representing the start of the month for the given date.
 */
export function getMonthStart(date: Date | string = new Date()): string {
  return format(dfStartOfMonth(toDate(date)), "yyyy-MM-dd");
}

/**
 * Returns the 'yyyy-MM-dd' string for the Monday of the week for the given date.
 */
export function getMondayOfWeek(date: Date | string = new Date()): string {
  return formatLocalDateKey(getStartOfWeek(date));
}

/**
 * Formats a date or 'yyyy-MM' / 'yyyy-MM-dd' string into Indonesian human-readable string (e.g. "November 2026").
 */
export function formatMonthLabel(date: Date | string): string {
  const d = typeof date === "string" && date.length === 7 ? `${date}-01` : date;
  return format(toDate(d), "MMMM yyyy", { locale: id });
}

/**
 * Returns start of today (00:00:00).
 */
export function getStartOfToday(): Date {
  return dfStartOfDay(new Date());
}

/**
 * Checks if a task's due_date is in the past (before now).
 */
export function isPastDeadline(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return isBefore(toDate(dueDate), new Date());
}
