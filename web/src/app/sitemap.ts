import type { MetadataRoute } from "next";
import { getCities, getCityEvents } from "@/lib/data";

const BASE = "https://www.lanit.club";

/** Mapa del sitio para Google: inicio, ciudades y cada evento a la venta. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cities = await getCities();
  const events = (await Promise.all(cities.map((c) => getCityEvents(c.id)))).flat();
  return [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/ciudades`, changeFrequency: "weekly", priority: 0.5 },
    ...events.map((e) => ({ url: `${BASE}/e/${e.id}`, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
