import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import LoginForm from "@/components/LoginForm";
import SignOut from "@/components/SignOut";
import { getUser } from "@/lib/auth";
import { currentCity } from "@/lib/city";
import { getCities } from "@/lib/data";
import { MONTHS } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Perfil · la nit" };

const PTS_PER_TICKET = 100;
const LEVELS = [
  { id: "bronce", n: "Bronce", at: 0 },
  { id: "plata", n: "Plata", at: 1000 },
  { id: "oro", n: "Oro", at: 2500 },
  { id: "black", n: "Black", at: 5000 },
];

function level(points: number) {
  let i = 0;
  LEVELS.forEach((l, j) => { if (points >= l.at) i = j; });
  const cur = LEVELS[i], next = LEVELS[i + 1];
  const pct = next ? Math.min(100, ((points - cur.at) / (next.at - cur.at)) * 100) : 100;
  return { cur, next, pct };
}

type Row = { event: { id: string; city_id: string }; tickets: { id: string }[] };

async function history(email: string) {
  const { data } = await supabaseAdmin()
    .from("orders")
    .select("event:events(id, city_id), tickets(id)")
    .ilike("buyer_email", email)
    .eq("status", "paid")
    .limit(500);
  const rows = (data as unknown as Row[]) ?? [];
  return {
    tickets: rows.reduce((s, r) => s + r.tickets.length, 0),
    events: new Set(rows.map((r) => r.event.id)).size,
    cities: new Set(rows.map((r) => r.event.city_id)).size,
  };
}

function MemberCard({ lvl, name, since, number, points }: { lvl: (typeof LEVELS)[number]; name: string; since: string; number: string; points: number }) {
  return (
    <div className={`member m-${lvl.id}`}>
      <div className="member-top">
        <span className="member-logo">la nit<b>.</b></span>
        <span className="member-tier">{lvl.n}</span>
      </div>
      <div className="member-pts">
        <b>{points.toLocaleString("es-MX")}</b>
        <span>puntos</span>
      </div>
      <div className="member-foot">
        <span className="member-name">{name}</span>
        <span>Nº {number} · desde {since}</span>
      </div>
    </div>
  );
}

export default async function Perfil() {
  const user = await getUser();

  if (!user) {
    return (
      <main className="shell">
        <header className="top"><span className="logo">Perfil</span></header>
        <section className="section">
          <div className="member m-bronce preview" aria-hidden="true">
            <div className="member-top"><span className="member-logo">la nit<b>.</b></span><span className="member-tier">Bronce</span></div>
            <div className="member-pts"><b>0</b><span>puntos</span></div>
            <div className="member-foot"><span className="member-name">Tu tarjeta de miembro</span><span>Bronce, Plata, Oro y Black</span></div>
          </div>
          <h1 className="ptitle">Entra con tu email</h1>
          <p className="muted" style={{ fontSize: 14, margin: "6px 0 18px", lineHeight: 1.5 }}>
            Guarda tus entradas en tu cuenta y suma {PTS_PER_TICKET} puntos por cada entrada que compres. Sin contraseñas: te mandamos un código.
          </p>
          <LoginForm next="/perfil" />
        </section>
        <p className="fine section" style={{ textAlign: "center", paddingTop: 36 }}>
          ¿Tienes un club? <Link href="/club" style={{ textDecoration: "underline" }}>la nit for clubs</Link>
        </p>
        <BottomNav />
      </main>
    );
  }

  const email = user.email ?? "";
  const [h, cities] = await Promise.all([email ? history(email) : Promise.resolve({ tickets: 0, events: 0, cities: 0 }), getCities()]);
  const { city } = await currentCity(cities);
  const points = h.tickets * PTS_PER_TICKET;
  const { cur, next, pct } = level(points);
  const created = new Date(user.created_at);
  const since = `${MONTHS[created.getUTCMonth()].slice(0, 3)} ${created.getUTCFullYear()}`;
  const number = user.id.replace(/-/g, "").slice(0, 6).toUpperCase();
  const name = email.split("@")[0];

  return (
    <main className="shell">
      <header className="top"><span className="logo">Perfil</span></header>

      <section className="section">
        <MemberCard lvl={cur} name={name} since={since} number={number} points={points} />
        <div className="progress">
          <div className="progress-txt">
            <span>Nivel {cur.n}</span>
            <span>{next ? `${(next.at - points).toLocaleString("es-MX")} pts para ${next.n}` : "Nivel máximo"}</span>
          </div>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        </div>
      </section>

      <section className="section">
        <div className="stats">
          <div className="stat"><b>{h.tickets}</b><span>Entradas</span></div>
          <div className="stat"><b>{h.events}</b><span>Eventos</span></div>
          <div className="stat"><b>{h.cities}</b><span>Ciudades</span></div>
        </div>
      </section>

      <section className="section">
        <h2 className="psub">Niveles</h2>
        <ol className="levels">
          {LEVELS.map((l) => (
            <li key={l.id} className={l.id === cur.id ? "on" : points >= l.at ? "done" : ""}>
              <span className={`swatch m-${l.id}`} aria-hidden="true" />
              <b>{l.n}</b>
              <span>{l.at === 0 ? "Al crear tu cuenta" : `${l.at.toLocaleString("es-MX")} pts`}</span>
            </li>
          ))}
        </ol>
        <p className="fine" style={{ marginTop: 10 }}>Ganas {PTS_PER_TICKET} puntos por cada entrada. Pronto podrás canjearlos por promos en los clubs.</p>
      </section>

      <section className="section">
        <h2 className="psub">Cuenta</h2>
        <nav className="settings" aria-label="Cuenta">
          <Link href="/entradas"><span>Mis entradas</span><span className="muted">{h.tickets}</span></Link>
          <Link href="/ciudades"><span>Ciudad</span><span className="muted">{city?.name ?? "Elegir"}</span></Link>
          <div><span>Email</span><span className="muted trunc">{email}</span></div>
          <Link href="/club"><span>la nit for clubs</span><span className="muted">Para clubs</span></Link>
        </nav>
        <div style={{ marginTop: 18 }}><SignOut to="/perfil" /></div>
      </section>
      <BottomNav />
    </main>
  );
}
