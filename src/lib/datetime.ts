/** Formats a UTC Date as a "YYYY-MM-DDTHH:mm" string in the given IANA timezone, for <input type="datetime-local">. */
export function toDatetimeLocalInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** The reverse: given a "YYYY-MM-DDTHH:mm" wall-clock string meant as local time in `timezone`, returns the true UTC instant. */
export function fromDatetimeLocalInTimezone(value: string, timezone: string): Date {
  const guessUTC = new Date(`${value}:00Z`);
  const offsetMinutes = timezoneOffsetMinutesAt(guessUTC, timezone);
  return new Date(guessUTC.getTime() - offsetMinutes * 60_000);
}

function timezoneOffsetMinutesAt(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = Number(map.hour) === 24 ? 0 : Number(map.hour);
  const asIfUTC = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), hour, Number(map.minute), Number(map.second));
  return (asIfUTC - date.getTime()) / 60_000;
}
