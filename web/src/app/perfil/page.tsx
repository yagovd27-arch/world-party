import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import LoginForm from "@/components/LoginForm";
import SignOut from "@/components/SignOut";
import { getUser } from "@/lib/auth";
import { currentCity } from "@/lib/city";
import { getCities } from "@/lib/data";
import { cityName, type Dict } from "@/lib/i18n";
import { getT } from "@/lib/lang";
import LangSwitch from "@/components/LangSwitch";
import { legalReady } from "@/lib/legal";

function LegalLinks() {
  if (!legalReady) return null;
  return (
    <nav className="footer-links" aria-label="Legal">
      <Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/refunds">Refunds</Link><Link href="/contact">Contact</Link>
    </nav>
  );
}
import { supabaseAdmin } from "@/lib/supabase/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t.nav.profile} · la nit` };
}

/** 23 puntos por cada ₹100 gastados en entradas (en México, por cada $20, que es lo mismo aprox.). */
const PTS = 23;
const PER: Record<string, number> = { INR: 100, MXN: 20 };
const ptsFor = (amount: number, currency: string) => Math.floor((amount / (PER[currency] ?? 100)) * PTS);
const LEVELS = [
  { id: "bronce", at: 0 },
  { id: "plata", at: 1150 },
  { id: "oro", at: 3450 },
  { id: "black", at: 9200 },
];

function level(points: number) {
  let i = 0;
  LEVELS.forEach((l, j) => { if (points >= l.at) i = j; });
  const cur = LEVELS[i], next = LEVELS[i + 1];
  const pct = next ? Math.min(100, ((points - cur.at) / (next.at - cur.at)) * 100) : 100;
  return { cur, next, pct };
}

type Row = { subtotal: number; currency: string; event: { id: string; city_id: string }; tickets: { id: string }[] };

async function history(email: string) {
  const { data } = await supabaseAdmin()
    .from("orders")
    .select("subtotal, currency, event:events(id, city_id), tickets(id)")
    .ilike("buyer_email", email)
    .eq("status", "paid")
    .limit(500);
  const rows = (data as unknown as Row[]) ?? [];
  return {
    tickets: rows.reduce((s, r) => s + r.tickets.length, 0),
    points: rows.reduce((s, r) => s + ptsFor(r.subtotal, r.currency), 0),
    events: new Set(rows.map((r) => r.event.id)).size,
    cities: new Set(rows.map((r) => r.event.city_id)).size,
  };
}

function MemberCard({ lvl, name, since, number, points, t }: { lvl: (typeof LEVELS)[number]; name: string; since: string; number: string; points: number; t: Dict }) {
  return (
    <div className={`member m-${lvl.id}`}>
      <div className="member-top">
        <span className="member-logo">la nit<b>.</b></span>
        <span className="member-tier">{t.profile.levelNames[lvl.id]}</span>
      </div>
      <div className="member-pts">
        <b>{points.toLocaleString("en-IN")}</b>
        <span>{t.profile.points}</span>
      </div>
      <div className="member-foot">
        <span className="member-name">{name}</span>
        <span>{t.profile.no} {number} · {t.profile.since} {since}</span>
      </div>
    </div>
  );
}

function ForClubs({ t }: { t: Dict }) {
  return (
    <a className="forclubs" href="https://clubs.lanit.club">
      <span>
        <b>la nit<i>.</i> <em>for clubs</em></b>
        <small>{t.profile.forClubs}</small>
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </a>
  );
}

export default async function Perfil() {
  const user = await getUser();
  const { lang, t } = await getT();
  const p = t.profile;

  if (!user) {
    return (
      <main className="shell">
        <header className="top"><span className="logo">{t.nav.profile}</span><LangSwitch /></header>
        <section className="section">
          <div className="member m-bronce preview" aria-hidden="true">
            <div className="member-top"><span className="member-logo">la nit<b>.</b></span><span className="member-tier">{p.levelNames.bronce}</span></div>
            <div className="member-pts"><b>0</b><span>{p.points}</span></div>
            <div className="member-foot"><span className="member-name">{p.yourCard}</span><span>{p.tiers}</span></div>
          </div>
          <h1 className="ptitle">{t.login.title}</h1>
          <p className="muted" style={{ fontSize: 14, margin: "6px 0 18px", lineHeight: 1.5 }}>
            {p.intro(PTS)}
          </p>
          <LoginForm next="/perfil" />
        </section>
        <section className="section" style={{ paddingTop: 30 }}><ForClubs t={t} /></section>
        <LegalLinks />
        <BottomNav />
      </main>
    );
  }

  const email = user.email ?? "";
  const [h, cities] = await Promise.all([email ? history(email) : Promise.resolve({ tickets: 0, points: 0, events: 0, cities: 0 }), getCities()]);
  const { city } = await currentCity(cities);
  const points = h.points;
  const { cur, next, pct } = level(points);
  const created = new Date(user.created_at);
  const since = t.memberSince(t.mo[created.getUTCMonth()], created.getUTCFullYear());
  const number = user.id.replace(/-/g, "").slice(0, 6).toUpperCase();
  const name = email.split("@")[0];

  return (
    <main className="shell">
      <header className="top"><span className="logo">{t.nav.profile}</span><LangSwitch /></header>

      <section className="section">
        <MemberCard lvl={cur} name={name} since={since} number={number} points={points} t={t} />
        <div className="progress">
          <div className="progress-txt">
            <span>{p.level(p.levelNames[cur.id])}</span>
            <span>{next ? p.toNext((next.at - points).toLocaleString("en-IN"), p.levelNames[next.id]) : p.maxLevel}</span>
          </div>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        </div>
      </section>

      <section className="section">
        <div className="stats">
          <div className="stat"><b>{h.tickets}</b><span>{p.tickets}</span></div>
          <div className="stat"><b>{h.events}</b><span>{p.events}</span></div>
          <div className="stat"><b>{h.cities}</b><span>{p.cities}</span></div>
        </div>
      </section>

      <section className="section">
        <h2 className="psub">{p.levels}</h2>
        <ol className="levels">
          {LEVELS.map((l) => (
            <li key={l.id} className={l.id === cur.id ? "on" : points >= l.at ? "done" : ""}>
              <span className={`swatch m-${l.id}`} aria-hidden="true" />
              <b>{p.levelNames[l.id]}</b>
              <span>{l.at === 0 ? p.onSignup : `${l.at.toLocaleString("en-IN")} pts`}</span>
            </li>
          ))}
        </ol>
        <p className="fine" style={{ marginTop: 10 }}>{p.howPoints(PTS)}</p>
      </section>

      <section className="section">
        <h2 className="psub">{p.account}</h2>
        <nav className="settings" aria-label={p.account}>
          <Link href="/entradas"><span>{t.nav.myTickets}</span><span className="muted">{h.tickets}</span></Link>
          <Link href="/ciudades"><span>{p.city}</span><span className="muted">{city ? cityName(city, lang) : p.choose}</span></Link>
          <div><span>{t.email}</span><span className="muted trunc">{email}</span></div>
        </nav>
        <div style={{ marginTop: 18 }}><ForClubs t={t} /></div>
        <div style={{ marginTop: 12 }}><SignOut to="/perfil" /></div>
      </section>
      <LegalLinks />
      <BottomNav />
    </main>
  );
}
