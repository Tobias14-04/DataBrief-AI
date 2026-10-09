/** Calendar dates, without locale guessing. Numeric text dates are Danish DMY
 * (2-digit years mean 20xx); ISO is YMD. Date objects keep their local calendar
 * date, including Excel cellDates values. Excel serials use the 1900 system,
 * discard time-of-day and reject the fictitious 1900-02-29. No US/Date.parse fallback.
 */
export function parseBusinessDate(value: unknown): Date | null {
  const calendarDate = (year: number, month: number, day: number) => {
    if (year < 100 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  };
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? calendarDate(value.getFullYear(), value.getMonth() + 1, value.getDate()) : null;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 1 || value >= 2_958_466) return null;
    const serial = Math.floor(value);
    if (serial === 60) return null;
    const date = new Date(Date.UTC(1899, 11, 31) + (serial > 60 ? serial - 1 : serial) * 86_400_000);
    return calendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  const iso = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/.exec(text);
  if (iso) return calendarDate(Number(iso[1]), Number(iso[3]), Number(iso[4]));
  const timestamp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.exec(text);
  if (timestamp) {
    if (!calendarDate(Number(timestamp[1]), Number(timestamp[2]), Number(timestamp[3]))
      || Number(timestamp[4]) > 23 || Number(timestamp[5]) > 59 || Number(timestamp[6] ?? 0) > 59) return null;
    const date = new Date(text);
    return Number.isFinite(date.getTime()) ? calendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) : null;
  }
  const danish = /^(\d{1,2})([./-])(\d{1,2})\2(\d{2}|\d{4})$/.exec(text);
  if (danish) return calendarDate(Number(danish[4]) + (danish[4].length === 2 ? 2000 : 0), Number(danish[3]), Number(danish[1]));
  return null;
}

export function businessDayKey(value: unknown): string | null {
  const date = parseBusinessDate(value);
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : null;
}
