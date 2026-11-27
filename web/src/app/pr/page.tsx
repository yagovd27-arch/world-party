import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import CopyLink from "@/components/CopyLink";
import LangSwitch from "@/components/LangSwitch";
import LoginForm from "@/components/LoginForm";
import SubmitButton from "@/components/SubmitButton";
import { getUser } from "@/lib/auth";
import { dayLabel, money, tzFor } from "@/lib/format";
import { getT } from "@/lib/lang";
import { PR_LEVELS, getMyPromoter, normalizeCode, prLevel, statsForPromoter } from "@/lib/promoters";
import { isSupabaseOn, supabaseAdmin } from "@/lib/supabase/server";
import { createPromoter } from "./actions";

const SITE = "https://lanit.club";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t.pr.title} | la nit`, description: t.pr.metaDesc };
}

export default async function PrPanel({ searchParams }: PageProps<"/pr">) {
  const sp = await searchParams;
  const { lang, t } = await getT();
  const p = t.pr;
  const user = isSupabaseOn ? await getUser() : null;

  const head = (
    <header className="top">
      <Link className="icon-btn" href="/perfil" aria-label={t.back}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </Link>
      <span className="logo" style={{ fontSize: 20 }}>{p.title}</span>
      <LangSwitch />
    </header>
  );

  const pitch = (
    <>
      <h1 className="ptitle">{p.introTitle}</h1>
      <p className="muted" style={{ fontSize: 14, margin: "8px 0 14px", lineHeight: 1.5 }}>{p.intro}</p>
      <ul className="prpoints">
        <li>{p.point1}</li>
        <li>{p.point2}</li>
        <li>{p.point3}</li>
      </ul>
    </>
  );

  if (!user) {
    return (
      <main className="shell">
        {head}
        <section className="section">
          {pitch}
          <div style={{ marginTop: 22 }}><LoginForm next="/pr" /></div>
        </section>
        <BottomNav />
      </main>
    );
  }

  const me = await getMyPromoter(user.id, user.email);
  if (!me) {
    const err = typeof sp.e === "string" ? sp.e : "";
    const name = typeof sp.name === "string" ? sp.name : "";
    const suggest = typeof sp.code === "string" ? sp.code : normalizeCode((user.email ?? "").split("@")[0]).slice(0, 10);
    return (
      <main className="shell">
        {head}
        <section className="section">
          {pitch}
          <form action={createPromoter} className="card" style={{ marginTop: 22 }}>
            <h2 className="psub">{p.createTitle}</h2>
            <div className="field">
              <label htmlFor="name">{p.yourName}</label>
              <input id="name" name="name" required minLength={2} maxLength={60} defaultValue={name} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="code">{p.yourCode}</label>
              <input id="code" name="code" required minLength={3} maxLength={16} pattern="[A-Za-z0-9]{3,16}" defaultValue={suggest} style={{ textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }} autoCapitalize="characters" autoComplete="off" />
              <span className="fine">{p.codeHelp}</span>
            </div>
            {err && <p className="error">{err}</p>}
            <SubmitButton className="cta gold block">{p.create}</SubmitButton>
          </form>
        </section>
        <BottomNav />
      </main>
    );
  }

  const [s, { data: cityRows }] = await Promise.all([
    statsForPromoter(me.id),
    supabaseAdmin().from("cities").select("id, currency_symbol"),
  ]);
  const sym = (cityId: string) => ((cityRows as { id: string; currency_symbol: string }[]) ?? []).find((c) => c.id === cityId)?.currency_symbol ?? "";
  const { cur, next, pct } = prLevel(s.tickets);
  // Totales de dinero solo si todo es en la misma moneda; si no, se ve por club.
  const syms = [...new Set(s.clubs.map((c) => sym(c.city_id)))];
  const oneSym = syms.length === 1 ? syms[0] : null;
  const earned = s.clubs.reduce((n, c) => n + c.earned, 0);
  const owed = s.clubs.reduce((n, c) => n + c.owed, 0);
  const link = `${SITE}/p/${me.code}`;

  return (
    <main className="shell">
      {head}
      <section className="section">
        <div className={`prcard pr-${cur.id}`}>
          <div className="member-top">
            <span className="member-logo">la nit<b>.</b> <small>PR</small></span>
            <span className="member-tier">{cur.name}</span>
          </div>
          <div className="prcode">{me.code}</div>
          <div className="member-foot">
            <span className="member-name">{me.name}</span>
            <span>{p.ticketsN(s.tickets)}</span>
          </div>
        </div>
        <div className="progress">
          <div className="progress-txt">
            <span>{cur.name}</span>
            <span>{next ? p.toNext(next.at - s.tickets, next.name) : p.maxLevel}</span>
          </div>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        </div>
        <div style={{ marginTop: 18 }}>
          <span className="fine">{p.yourLink}</span>
          <CopyLink url={link} label={p.copy} copied={p.copied} />
        </div>
      </section>

      <section className="section">
        <div className="stats">
          <div className="stat"><b>{s.tickets}</b><span>{p.sold}</span></div>
          <div className="stat"><b>{oneSym !== null ? money(earned, oneSym) : "—"}</b><span>{p.earned}</span></div>
          <div className="stat"><b>{oneSym !== null ? money(owed, oneSym) : "—"}</b><span>{p.owed}</span></div>
        </div>
      </section>

      <section className="section">
        <h2 className="psub">{p.byClub}</h2>
        {s.clubs.length ? (
          <>
            <table className="t">
              <thead><tr><th>{p.cClub}</th><th>{p.cTickets}</th><th>{p.cPct}</th><th>{p.cEarned}</th><th>{p.cOwed}</th></tr></thead>
              <tbody>
                {s.clubs.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}{!c.added && <span className="fine" style={{ display: "block" }}>{p.notAdded}</span>}</td>
                    <td>{c.tickets}</td>
                    <td>{c.added ? `${c.pct}%` : "—"}</td>
                    <td>{money(c.earned, sym(c.city_id))}</td>
                    <td>{money(c.owed, sym(c.city_id))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {s.clubs.some((c) => !c.added) && <p className="fine" style={{ marginTop: 10 }}>{p.notAddedHelp}</p>}
          </>
        ) : (
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>{p.noClubs}</p>
        )}
      </section>

      {s.upcoming.length > 0 && (
        <section className="section">
          <h2 className="psub">{p.upcoming}</h2>
          <div className="prlinks">
            {s.upcoming.map((e) => (
              <div key={e.id}>
                <span><b>{e.title}</b><span className="fine" style={{ display: "block" }}>{dayLabel(e.starts_at, tzFor(e.city_id), lang)}, {e.club.name}</span></span>
                <CopyLink url={`${link}?e=${e.id}`} label={p.copy} copied={p.copied} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="psub">{p.byEvent}</h2>
        {s.events.length ? (
          <table className="t">
            <tbody>
              {s.events.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}<span className="fine" style={{ display: "block" }}>{dayLabel(e.starts_at, tzFor(e.city_id), lang)}, {e.club}</span></td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{p.ticketsN(e.tickets)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>{p.noSales}</p>
        )}
      </section>

      <section className="section">
        <h2 className="psub">{p.levels}</h2>
        <ol className="levels">
          {PR_LEVELS.map((l) => (
            <li key={l.id} className={l.id === cur.id ? "on" : s.tickets >= l.at ? "done" : ""}>
              <span className={`swatch pr-${l.id}`} aria-hidden="true" />
              <b>{l.name}</b>
              <span>{p.ticketsN(l.at)}</span>
            </li>
          ))}
        </ol>
      </section>
      <BottomNav />
    </main>
  );
}
