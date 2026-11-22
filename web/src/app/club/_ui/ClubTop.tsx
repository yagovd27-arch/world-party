import Link from "next/link";

/** Cabecera de la nit for clubs (web aparte de la de compradores). */
export default function ClubTop({ active, admin = false, loggedIn = true }: { active?: "panel" | "scan" | "admin"; admin?: boolean; loggedIn?: boolean }) {
  return (
    <>
      <header className="panel-top">
        <Link href="/club" className="logo">la nit<b>.</b> <span className="muted" style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0 }}>for clubs</span></Link>
        {loggedIn && <Link href="/club/salir" className="fine">Salir</Link>}
      </header>
      {loggedIn && (
        <nav className="tabs" aria-label="Panel">
          <Link href="/club" className={active === "panel" ? "on" : ""}>Eventos</Link>
          <Link href="/club/scan" className={active === "scan" ? "on" : ""}>Escanear QR</Link>
          {admin && <Link href="/club/admin" className={active === "admin" ? "on" : ""}>Admin</Link>}
        </nav>
      )}
    </>
  );
}
