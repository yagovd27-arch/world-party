const WD = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Todas las fechas se muestran en la zona horaria de la ciudad del evento. */
export const CITY_TZ: Record<string, string> = {
  delhi: "Asia/Kolkata",
  gurugram: "Asia/Kolkata",
  puebla: "America/Mexico_City",
  cdmx: "America/Mexico_City",
  monterrey: "America/Monterrey",
  guadalajara: "America/Mexico_City",
  shanghai: "Asia/Shanghai",
};

export function tzFor(cityId: string) {
  return CITY_TZ[cityId] ?? "UTC";
}

/** Partes de fecha (año, mes, día, día de la semana, hora) en la zona de la ciudad. */
export function parts(iso: string | Date, tz: string) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    year: Number(get("year")),
    month: Number(get("month")) - 1,
    day: Number(get("day")),
    weekday: wdMap[get("weekday")] ?? 0,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** Días de diferencia entre hoy y la fecha (en la zona de la ciudad). */
export function dayOffset(iso: string, tz: string) {
  const a = parts(new Date(), tz).ymd;
  const b = parts(iso, tz).ymd;
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
}

export function shortDate(iso: string, tz: string) {
  const p = parts(iso, tz);
  return `${WD[p.weekday]} ${p.day} ${MO[p.month]}`;
}

export function dayLabel(iso: string, tz: string) {
  const off = dayOffset(iso, tz);
  const s = shortDate(iso, tz);
  if (off === 0) return `Hoy · ${s}`;
  if (off === 1) return `Mañana · ${s}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function weekdayShort(d: Date, tz: string) {
  return WD[parts(d, tz).weekday];
}

export function money(n: number, symbol: string) {
  return symbol + Math.round(n).toLocaleString(symbol === "₹" ? "en-IN" : "en-US");
}

export function serviceFee(subtotal: number, rate: number) {
  return Math.round(subtotal * rate);
}

/** "2026-12-13T22:00" en la hora de la ciudad → ISO en UTC. */
export function zonedToUtc(local: string, tz: string) {
  const guess = Date.parse(local.length === 16 ? local + ":00Z" : local + "Z");
  if (Number.isNaN(guess)) return null;
  const offset = (ts: number) => {
    const p = parts(new Date(ts), tz);
    return Date.parse(`${p.ymd}T${p.time}:00Z`) - Math.floor(ts / 60000) * 60000;
  };
  let ts = guess - offset(guess);
  ts = guess - offset(ts);
  return new Date(ts).toISOString();
}

/** ISO en UTC → valor para <input type="datetime-local"> en la hora de la ciudad. */
export function utcToLocalInput(iso: string, tz: string) {
  const p = parts(iso, tz);
  return `${p.ymd}T${p.time}`;
}
