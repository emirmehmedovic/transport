/** Date-only keys are stored at UTC midnight; they represent Sarajevo calendar dates. */
export const SCHENGEN_TIMEZONE = "Europe/Sarajevo";
export const DAY_MS = 86_400_000;
export function toDayKeyInTimeZone(date: Date, timeZone = SCHENGEN_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map(type => parts.find(p => p.type === type)!.value).join("-");
}
export function dayKeyDate(key: string): Date { return new Date(`${key}T00:00:00.000Z`); }
export function shiftDay(key: string, days: number): string { return new Date(dayKeyDate(key).getTime() + days * DAY_MS).toISOString().slice(0, 10); }
export function localDayStart(key: string): Date {
  let instant = dayKeyDate(key).getTime();
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: SCHENGEN_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
    const v = (type: string) => Number(parts.find(p => p.type === type)!.value);
    const represented = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
    instant += dayKeyDate(key).getTime() - represented;
  }
  return new Date(instant);
}
