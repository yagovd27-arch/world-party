import "server-only";
import { DEMO_CITIES, DEMO_EVENTS } from "./demo";
import { isSupabaseOn, supabaseServer } from "./supabase/server";
import type { City, EventItem } from "./types";

const EVENT_SELECT =
  "id, club_id, city_id, title, description, lineup, type, starts_at, image_url, min_age, dress_code, status, club:clubs(name, area, address, instagram, verified), ticket_types(*)";

function sortTiers(e: EventItem): EventItem {
  return { ...e, ticket_types: [...(e.ticket_types ?? [])].sort((a, b) => a.sort - b.sort) };
}

export async function getCities(): Promise<City[]> {
  if (!isSupabaseOn) return DEMO_CITIES;
  const sb = await supabaseServer();
  const { data } = await sb.from("cities").select("*").eq("active", true).order("sort");
  return (data as City[]) ?? [];
}

export async function getCity(id: string): Promise<City | undefined> {
  const all = await getCities();
  return all.find((c) => c.id === id);
}

/** Eventos publicados de una ciudad, desde hace 6 horas en adelante. */
export async function getCityEvents(cityId: string): Promise<EventItem[]> {
  const since = new Date(Date.now() - 6 * 3600e3).toISOString();
  if (!isSupabaseOn) {
    return DEMO_EVENTS.filter((e) => e.city_id === cityId && e.starts_at >= since)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }
  const sb = await supabaseServer();
  const { data } = await sb
    .from("events")
    .select(EVENT_SELECT)
    .eq("city_id", cityId)
    .eq("status", "published")
    .gte("starts_at", since)
    .order("starts_at");
  return ((data as unknown as EventItem[]) ?? []).map(sortTiers);
}

export async function getEvent(id: string): Promise<EventItem | undefined> {
  if (!isSupabaseOn) return DEMO_EVENTS.find((e) => e.id === id);
  const sb = await supabaseServer();
  const { data } = await sb.from("events").select(EVENT_SELECT).eq("id", id).maybeSingle();
  return data ? sortTiers(data as unknown as EventItem) : undefined;
}

export async function getEventCounts(): Promise<Record<string, number>> {
  const cities = await getCities();
  const out: Record<string, number> = {};
  await Promise.all(cities.map(async (c) => { out[c.id] = (await getCityEvents(c.id)).length; }));
  return out;
}
