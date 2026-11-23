import type { City, EventItem, TicketType } from "./types";

/**
 * Datos de ejemplo: se usan solo mientras Supabase no está conectado
 * (sin NEXT_PUBLIC_SUPABASE_URL). Sirven para enseñar la web antes de tener clubs reales.
 */
const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

export const DEMO_CITIES: City[] = [
  { id: "delhi", name: "Delhi", country: "India", currency: "INR", currency_symbol: "₹", image_url: IMG("photo-1587474260584-136574528ed5") },
  { id: "puebla", name: "Puebla", country: "México", currency: "MXN", currency_symbol: "$", image_url: IMG("photo-1653661279002-692227e35f0f") },
  { id: "cdmx", name: "Ciudad de México", country: "México", currency: "MXN", currency_symbol: "$", image_url: IMG("photo-1599067821475-c47c29093bf7") },
  { id: "monterrey", name: "Monterrey", country: "México", currency: "MXN", currency_symbol: "$", image_url: IMG("photo-1561158250-01426799e9e0") },
  { id: "guadalajara", name: "Guadalajara", country: "México", currency: "MXN", currency_symbol: "$", image_url: IMG("photo-1599624893198-d000bdd8bef8") },
  { id: "shanghai", name: "Shanghai", country: "China", currency: "CNY", currency_symbol: "¥", image_url: IMG("photo-1627484986972-e544190b8abb") },
];

const at = (daysFromNow: number, hhmm: string) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

let tid = 0;
const tiers = (eventId: string, p: [number, number, number], earlyLeft: number, vipNote: string): TicketType[] => [
  { id: `t${++tid}`, event_id: eventId, name: "Early bird", description: null, price: p[0], capacity: 50, sold: 50 - earlyLeft, sales_end: null, sort: 0 },
  { id: `t${++tid}`, event_id: eventId, name: "General", description: "Acceso general", price: p[1], capacity: 300, sold: 120, sales_end: null, sort: 1 },
  { id: `t${++tid}`, event_id: eventId, name: "VIP", description: vipNote, price: p[2], capacity: 12, sold: 4, sales_end: null, sort: 2 },
];

type Seed = [id: string, city: string, club: string, area: string, title: string, day: number, time: string, img: string, desc: string, lineup: string[], prices: [number, number, number], earlyLeft: number, vip: string, type?: EventItem["type"]];

const SEEDS: Seed[] = [
  ["la-desgracia-navidad", "delhi", "LA DESGRACIA", "Gurugram", "LA DESGRACIA · Navidad", 21, "22:00", "photo-1517263904808-5dc91e3e7044", "Segunda edición de LA DESGRACIA, en versión navideña: música toda la noche y dress code rojo.", ["DJ invitado", "Open decks"], [799, 1199, 3999], 0, "Mesa reservada", "fiesta"],
  ["neon-saturdays", "delhi", "Club Aurora", "Sector 29", "Neon Saturdays", 0, "23:00", "photo-1764510377343-e5b12385791b", "House y tech house hasta que cierre el club.", ["DJ residente", "Invitado sorpresa"], [799, 1199, 3999], 18, "Mesa reservada · barra exclusiva"],
  ["rooftop-sunset", "delhi", "Terraza Kaya", "Cyber Hub", "Rooftop Sunset Sessions", 1, "18:30", "photo-1758810409996-583f3bad7d51", "Atardecer, cócteles y deep house con vista a la ciudad.", ["Sunset DJ set"], [799, 1199, 3999], 9, "Mesa en terraza"],
  ["bergamo-saturdays", "delhi", "Bergamo", "Vasant Kunj", "Bergamo Saturdays", 0, "22:30", "photo-1764510377343-e5b12385791b", "Hip-hop y lo más sonado del momento.", ["DJ residente"], [1499, 1999, 9999], 14, "Mesa para 4 · botella incluida"],
  ["bulach-nights", "delhi", "Bulach", "Qutab Institutional Area", "Bulach Nights", 1, "22:00", "photo-1763757575623-ffafe0867aa3", "Cócteles, ambiente mediterráneo y DJ hasta tarde.", ["DJ invitado"], [999, 1499, 7999], 20, "Mesa reservada"],
  ["bohca-weekend", "delhi", "Bohca", "Adchini", "Bohca Weekend", 2, "23:00", "photo-1578736641330-3155e606cd40", "Pista llena y música comercial toda la noche.", ["DJ residente"], [1299, 1799, 8999], 0, "Mesa VIP junto a cabina"],
  ["dear-donna", "delhi", "Dear Donna", "Qutab Institutional Area", "Dear Donna · Guestlist", 4, "21:30", "photo-1545128485-c400e7702796", "Terraza al aire libre y lista de invitados.", ["DJ residente"], [1199, 1699, 8499], 25, "Mesa en terraza"],
  ["noche-roma", "cdmx", "Club Lumbre", "Col. Roma", "Noche Roma", 0, "23:00", "photo-1763757575623-ffafe0867aa3", "Electrónica en el corazón de la Roma.", ["DJ residente", "B2B invitado"], [250, 400, 1200], 15, "Mesa reservada"],
  ["reventon-angelopolis", "puebla", "Club Talavera", "Angelópolis", "Reventón Angelópolis", 1, "22:30", "photo-1574155376612-bfa4ed8aabfd", "Tres ambientes y pista principal llena.", ["DJ residente", "Invitado"], [250, 400, 1200], 22, "Mesa reservada"],
  ["bund-rooftop", "shanghai", "Sky Lounge", "The Bund", "The Bund Rooftop", 1, "21:00", "photo-1614221330834-9399e5631af3", "Vista al skyline de Pudong, cócteles y house.", ["DJ residente"], [120, 180, 600], 14, "Mesa reservada"],
];

export const DEMO_EVENTS: EventItem[] = SEEDS.map(([id, city, club, area, title, day, time, img, desc, lineup, prices, early, vip, type]) => ({
  id, club_id: `club-${club}`, city_id: city, title, description: desc, lineup,
  type: type ?? "club", starts_at: at(day, time), image_url: IMG(img), min_age: 18, dress_code: null,
  status: "published", club: { name: club, area, verified: true },
  ticket_types: tiers(id, prices, early, vip),
}));
