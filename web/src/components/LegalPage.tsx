import Link from "next/link";

/** Plantilla de las páginas legales (texto en inglés: es el que piden Razorpay y los compradores en India). */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="shell legal">
      <header className="top">
        <Link href="/" className="logo">la nit<b>.</b></Link>
      </header>
      <article className="section">
        <h1 className="ptitle">{title}</h1>
        <p className="fine" style={{ marginTop: 6 }}>Last updated: {updated}</p>
        {children}
        <nav className="legal-nav" aria-label="Legal">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/refunds">Refunds &amp; cancellations</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </article>
    </main>
  );
}
