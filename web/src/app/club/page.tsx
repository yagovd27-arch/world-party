import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export const metadata = { title: "Para clubs · la nit" };

export default function ClubLanding() {
  return (
    <main className="shell">
      <header className="top"><span className="logo">la nit<b>.</b> <span className="muted" style={{ fontSize: 15, fontWeight: 600 }}>para clubs</span></span></header>
      <section className="section">
        <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>Vende tus entradas gratis.</h1>
        <p className="desc">Publica tus eventos en 3 minutos, vende early bird, general y VIP, y escanea los QR en la puerta desde el móvil. Al club no le cuesta nada: el comprador paga un pequeño cargo de servicio.</p>
        <div className="card" style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <span>✓ Ventas en tiempo real</span>
          <span>✓ Cupos y precios por tipo de entrada</span>
          <span>✓ Escáner de QR en la puerta, cada entrada vale una vez</span>
          <span>✓ Lista de compradores para tu equipo</span>
        </div>
        <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
          <Link className="cta block" href="/club/login">Entrar al panel</Link>
        </div>
      </section>
      <BottomNav />
    </main>
  );
}
