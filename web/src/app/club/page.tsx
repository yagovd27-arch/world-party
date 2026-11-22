import Link from "next/link";
import { cookies } from "next/headers";
import LoginForm from "@/components/LoginForm";
import SubmitButton from "@/components/SubmitButton";
import { getCities } from "@/lib/data";
import { getCurrentClub, getUser, isAdmin } from "@/lib/auth";
import { dayLabel, money, parts, tzFor } from "@/lib/format";
import { isSupabaseOn, supabaseServer } from "@/lib/supabase/server";
import { createClub, switchClub } from "./actions";
import ClubTop from "./_ui/ClubTop";

export const metadata = { title: { absolute: "la nit for clubs" }, description: "Vende las entradas de tu club gratis y escanea los QR en la puerta." };

type Ev = {
  id: string; title: string; starts_at: string; status: string; city_id: string;
  ticket_types: { price: number; sold: number; capacity: number }[];
};

const STATUS: Record<string, string> = { draft: "Borrador", published: "Publicado", cancelled: "Cancelado" };

export default async function ClubHome({ searchParams }: PageProps<"/club">) {
  const sp = await searchParams;
  const err = typeof sp.e === "string" ? sp.e : "";
  const user = await getUser();

  if (!user) {
    return (
      <>
        <ClubTop loggedIn={false} />
        <section className="section" style={{ maxWidth: 520 }}>
          <h1 style={{ fontFamily: "var(--display)", fontSize: 56, fontWeight: 400, lineHeight: 1, letterSpacing: 0 }}>Vende tus entradas sin pagar nada</h1>
          <p className="desc">Publica tu evento en tres minutos y compártelo en Instagram. El dinero de cada entrada es para el club.</p>
          <dl className="facts" style={{ margin: "22px 0 26px" }}>
            <div><dt>Ventas</dt><dd>Las ves en tiempo real, entrada a entrada.</dd></div>
            <div><dt>Entradas</dt><dd>Early bird, general y VIP, cada una con su precio y su cupo.</dd></div>
            <div><dt>Puerta</dt><dd>Escaneas los QR con el móvil. Cada entrada vale una sola vez.</dd></div>
            <div><dt>Coste</dt><dd>Cero para el club. El comprador paga un cargo de servicio.</dd></div>
          </dl>
          {isSupabaseOn ? <LoginForm next="/club" cta="Entrar o registrar mi club" /> : <p className="notice">El panel se activa al conectar la base de datos.</p>}
        </section>
      </>
    );
  }

  const store = await cookies();
  const [{ club, mine }, admin] = await Promise.all([getCurrentClub(store.get("club")?.value), isAdmin()]);

  if (!club) {
    const cities = await getCities();
    return (
      <>
        <ClubTop admin={admin} />
        <section className="section" style={{ maxWidth: 520 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Registra tu club</h1>
          <p className="muted" style={{ fontSize: 14, margin: "6px 0 18px" }}>También vale si eres organizador o promotor. Revisamos cada club antes de que pueda publicar (normalmente el mismo día).</p>
          <form action={createClub}>
            <div className="field"><label htmlFor="name">Nombre del club u organizador</label><input id="name" name="name" required maxLength={80} placeholder="Bergamo" /></div>
            <div className="row2">
              <div className="field">
                <label htmlFor="city">Ciudad</label>
                <select id="city" name="city" required defaultValue={cities.find((c) => c.id === "gurugram")?.id ?? cities[0]?.id}>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="area">Zona</label><input id="area" name="area" maxLength={80} placeholder="Hauz Khas" /></div>
            </div>
            <div className="row2">
              <div className="field"><label htmlFor="instagram">Instagram</label><input id="instagram" name="instagram" maxLength={60} placeholder="@tuclub" /></div>
              <div className="field"><label htmlFor="phone">WhatsApp</label><input id="phone" name="phone" type="tel" maxLength={30} placeholder="+91 …" /></div>
            </div>
            <SubmitButton pendingText="Registrando…">Registrar</SubmitButton>
            {err && <p className="error" role="alert">{err}</p>}
          </form>
          <p className="fine" style={{ marginTop: 18 }}>Sesión: {user.email}</p>
        </section>
      </>
    );
  }

  const sb = await supabaseServer();
  const { data } = await sb
    .from("events")
    .select("id, title, starts_at, status, city_id, ticket_types(price, sold, capacity)")
    .eq("club_id", club.id)
    .order("starts_at", { ascending: false })
    .limit(100);
  const events = (data as Ev[]) ?? [];
  const cities = await getCities();
  const sym = cities.find((c) => c.id === club.city_id)?.currency_symbol ?? "";
  const cutoff = Date.now() - 12 * 3600e3;
  const upcoming = events.filter((e) => Date.parse(e.starts_at) >= cutoff).reverse();
  const past = events.filter((e) => Date.parse(e.starts_at) < cutoff);
  const sold = events.reduce((s, e) => s + e.ticket_types.reduce((a, t) => a + t.sold, 0), 0);
  const revenue = events.reduce((s, e) => s + e.ticket_types.reduce((a, t) => a + t.sold * t.price, 0), 0);

  const row = (e: Ev) => {
    const tz = tzFor(e.city_id);
    const s = e.ticket_types.reduce((a, t) => a + t.sold, 0);
    const cap = e.ticket_types.reduce((a, t) => a + t.capacity, 0);
    return (
      <Link key={e.id} href={`/club/eventos/${e.id}`} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ minWidth: 0 }}>
          <span className="fine">{dayLabel(e.starts_at, tz)} · {parts(e.starts_at, tz).time} h</span>
          <b style={{ display: "block", fontSize: 16 }}>{e.title}</b>
          <span className={`st st-${e.status}`}>{STATUS[e.status]}</span>
        </span>
        <span style={{ textAlign: "right", flexShrink: 0 }}>
          <b style={{ display: "block" }}>{s}/{cap}</b>
          <span className="fine">vendidas</span>
        </span>
      </Link>
    );
  };

  return (
    <>
      <ClubTop active="panel" admin={admin} />
      <section className="section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <span className="fine">{club.area ? `${club.area} · ` : ""}{cities.find((c) => c.id === club.city_id)?.name}</span>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>{club.name}</h1>
          </div>
          <Link href="/club/eventos/nuevo" className="cta">+ Nuevo evento</Link>
        </div>
        {mine.length > 1 && (
          <form action={switchClub} style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <select name="id" defaultValue={club.id} className="pill" style={{ background: "var(--wine-700)" }}>
              {mine.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="pill">Cambiar</button>
          </form>
        )}
        {!club.verified && (
          <p className="notice">Tu club está pendiente de verificación. Ya puedes crear eventos como borrador; en cuanto lo verifiquemos podrás publicarlos.</p>
        )}
        <div className="stats" style={{ marginTop: 18 }}>
          <div className="stat"><b>{upcoming.length}</b><span>Próximos eventos</span></div>
          <div className="stat"><b>{sold}</b><span>Entradas vendidas</span></div>
          <div className="stat"><b>{money(revenue, sym)}</b><span>Ventas (para el club)</span></div>
        </div>
      </section>
      <h2 className="ghead">Próximos</h2>
      <div className="list">
        {upcoming.length ? upcoming.map(row) : <div className="empty"><b>Sin eventos próximos</b>Crea tu primer evento y compártelo.</div>}
      </div>
      {past.length > 0 && (
        <>
          <h2 className="ghead">Pasados</h2>
          <div className="list" style={{ opacity: 0.65 }}>{past.map(row)}</div>
        </>
      )}
    </>
  );
}
