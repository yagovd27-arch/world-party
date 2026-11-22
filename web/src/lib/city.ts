import "server-only";
import { cookies, headers } from "next/headers";
import type { City } from "./types";

/** Centro aproximado de cada ciudad, para elegir la más cercana al visitante. */
const COORDS: Record<string, [number, number]> = {
  delhi: [28.6139, 77.209],
  gurugram: [28.4595, 77.0266],
  puebla: [19.0414, -98.2063],
  cdmx: [19.4326, -99.1332],
  monterrey: [25.6866, -100.3161],
  guadalajara: [20.6597, -103.3496],
  shanghai: [31.2304, 121.4737],
};

function km([a1, o1]: [number, number], [a2, o2]: [number, number]) {
  const r = Math.PI / 180;
  const x = Math.sin(((a2 - a1) * r) / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(((o2 - o1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}

/**
 * Ciudad actual: la que eligió la persona (cookie) o, si no eligió,
 * la más cercana según la ubicación de su conexión (Vercel la envía en cabeceras).
 */
export async function currentCity(cities: City[]): Promise<{ city: City | undefined; detected: boolean }> {
  const saved = (await cookies()).get("city")?.value;
  const chosen = cities.find((c) => c.id === saved);
  if (chosen) return { city: chosen, detected: false };

  const h = await headers();
  const lat = Number(h.get("x-vercel-ip-latitude"));
  const lng = Number(h.get("x-vercel-ip-longitude"));
  if (h.get("x-vercel-ip-latitude") && Number.isFinite(lat) && Number.isFinite(lng)) {
    let best: City | undefined;
    let bestKm = Infinity;
    for (const c of cities) {
      const p = COORDS[c.id];
      if (!p) continue;
      const d = km([lat, lng], p);
      if (d < bestKm) { bestKm = d; best = c; }
    }
    if (best) return { city: best, detected: true };
  }
  return { city: cities[0], detected: true };
}
