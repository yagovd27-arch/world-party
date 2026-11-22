import Link from "next/link";
import { signOutClub } from "../actions";
import LangSwitch from "@/components/LangSwitch";
import { getT } from "@/lib/lang";

/** Cabecera de la nit for clubs (web aparte de la de compradores). */
export default async function ClubTop({ active, admin = false, loggedIn = true }: { active?: "panel" | "scan" | "admin"; admin?: boolean; loggedIn?: boolean }) {
  const c = (await getT()).t.club;
  return (
    <>
      <header className="panel-top">
        <Link href="/club" className="logo">la nit<b>.</b> <span className="muted" style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0 }}>for clubs</span></Link>
        <div className="topright">
          <LangSwitch />
          {loggedIn && (
            <form action={signOutClub}>
              <button className="fine">{c.signOut}</button>
            </form>
          )}
        </div>
      </header>
      {loggedIn && (
        <nav className="tabs" aria-label={c.panel}>
          <Link href="/club" className={active === "panel" ? "on" : ""}>{c.tabEvents}</Link>
          <Link href="/club/scan" className={active === "scan" ? "on" : ""}>{c.tabScan}</Link>
          {admin && <Link href="/club/admin" className={active === "admin" ? "on" : ""}>{c.tabAdmin}</Link>}
        </nav>
      )}
    </>
  );
}
