import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { getCity } from "@/lib/data";
import { dayLabel, money, tzFor } from "@/lib/format";
import { getT } from "@/lib/lang";
import { rankingForClub } from "@/lib/promoters";
import SubmitButton from "@/components/SubmitButton";
import ClubTop from "../_ui/ClubTop";
import { addClubPromoter, markClubPromoterPaid, removeClubPromoter, setClubPromoterPct } from "../actions";

export const metadata = { title: "PRs · la nit for clubs" };

export default async function ClubPrs({ searchParams }: PageProps<"/club/prs">) {
  const sp = await searchParams;
  const { club, admin } = await requireClub();
  const { lang, t } = await getT();
  const k = t.pr.club;
  const ev = typeof sp.ev === "string" && /^[0-9a-f-]{36}$/i.test(sp.ev) ? sp.ev : "";
  const note = typeof sp.n === "string" ? sp.n : "";
  const err = typeof sp.e === "string" ? sp.e : "";

  const [{ events, list }, city] = await Promise.all([rankingForClub(club.id, ev || undefined), getCity(club.city_id)]);
  const sym = city?.currency_symbol ?? "";
  const tz = tzFor(club.city_id);
  const canEdit = club.role !== "door";
  const rows = ev ? list.filter((r) => r.tickets > 0) : list;
  const totTickets = list.reduce((n, r) => n + r.tickets, 0);
  const totRevenue = list.reduce((n, r) => n + r.revenue, 0);
  const totOwed = list.reduce((n, r) => n + r.owed, 0);
  const top = Math.max(1, ...rows.map((r) => r.tickets));

  return (
    <>
      <ClubTop active="prs" admin={admin} />
      <section className="section">
        <h1 className="ptitle">{k.title}</h1>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>{k.sub}</p>
        {note && <p className="notice">{note}</p>}
        {err && <p className="error">{err}</p>}

        <div className="stats" style={{ marginTop: 18 }}>
          <div className="stat"><b>{totTickets}</b><span>{k.totTickets}</span></div>
          <div className="stat"><b>{money(totRevenue, sym)}</b><span>{k.totRevenue}</span></div>
          <div className="stat"><b>{money(totOwed, sym)}</b><span>{k.totOwed}</span></div>
        </div>
      </section>

      {events.length > 0 && (
        <div className="section" style={{ paddingTop: 18 }}>
          <nav className="chipnav" aria-label={k.title}>
            <Link href="/club/prs" className={!ev ? "on" : ""}>{k.all}</Link>
            {events.slice(0, 12).map((e) => (
              <Link key={e.id} href={`/club/prs?ev=${e.id}`} className={ev === e.id ? "on" : ""}>
                {e.title} · {dayLabel(e.starts_at, tz, lang)}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <div className="section" style={{ paddingTop: 6 }}>
        {rows.length ? (
          <ol className="rank">
            {rows.map((r, i) => (
              <li key={r.id}>
                <div className="rank-main">
                  <span className="rank-pos">{i + 1}</span>
                  <span className="rank-who">
                    <b>{r.code}</b>
                    <span>{r.name} · {r.email}</span>
                  </span>
                  <span className="rank-num"><b>{r.tickets}</b><span>{k.cTickets.toLowerCase()}</span></span>
                </div>
                <div className="rank-bar"><i style={{ width: `${(r.tickets / top) * 100}%` }} /></div>
                <div className="rank-meta">
                  <span><em>{k.cRevenue}</em> {money(r.revenue, sym)}</span>
                  {r.added && <span><em>{k.cPct}</em> {r.pct}% · {money(ev ? r.commission : r.earned, sym)}</span>}
                  {r.added && !ev && <span><em>{k.cOwed}</em> {money(r.owed, sym)}</span>}
                  {totTickets > 0 && r.tickets > 0 && !ev && <span><em>{k.share(Math.round((r.tickets / totTickets) * 100))}</em></span>}
                </div>
                {!r.added && <div className="rank-meta"><span className="warn">{k.notAdded}</span></div>}
                {canEdit && (
                  <div className="rank-tools">
                    <form action={setClubPromoterPct}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="ev" value={ev} />
                      <input type="number" name="pct" min={0} max={50} step="0.5" defaultValue={r.pct} aria-label={k.pct} />
                      <span className="fine">%</span>
                      <SubmitButton className={`pill${r.added ? "" : " gold"}`}>{r.added ? k.save : k.add}</SubmitButton>
                    </form>
                    {r.added && !ev && (r.owed > 0 ? (
                      <form action={markClubPromoterPaid}>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton className="pill gold">{k.markPaid(money(r.owed, sym))}</SubmitButton>
                      </form>
                    ) : r.earned > 0 ? <span className="fine">{k.paidAll}</span> : null)}
                    {r.added && r.tickets === 0 && !ev && (
                      <form action={removeClubPromoter}>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton className="pill">{k.remove}</SubmitButton>
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : ev ? (
          <p className="muted" style={{ fontSize: 14 }}>{k.noSales}</p>
        ) : (
          <div className="card">
            <b>{k.empty}</b>
            <p className="fine" style={{ marginTop: 4 }}>{k.emptySub}</p>
          </div>
        )}
      </div>

      {canEdit && (
        <section className="section">
          <form action={addClubPromoter} className="card">
            <h2 className="psub">{k.addTitle}</h2>
            <p className="fine" style={{ marginBottom: 12 }}>{k.addHelp}</p>
            <div className="addpr">
              <div className="field">
                <label htmlFor="code">{k.code}</label>
                <input id="code" name="code" required minLength={3} maxLength={16} style={{ textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700 }} autoCapitalize="characters" autoComplete="off" />
              </div>
              <div className="field">
                <label htmlFor="pct">{k.pct}</label>
                <input id="pct" name="pct" type="number" min={0} max={50} step="0.5" defaultValue={10} required />
              </div>
            </div>
            <SubmitButton className="cta gold block">{k.add}</SubmitButton>
          </form>
          <p className="fine" style={{ marginTop: 10 }}>{k.paidNote}</p>
        </section>
      )}
    </>
  );
}
