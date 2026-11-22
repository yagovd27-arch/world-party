import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import LoginForm from "@/components/LoginForm";
import SignOut from "@/components/SignOut";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Perfil · la nit" };

export default async function Perfil() {
  const user = await getUser();
  return (
    <main className="shell">
      <header className="top"><span className="logo">Perfil</span></header>
      {!user ? (
        <section className="section">
          <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15 }}>Entra con tu email</h1>
          <p className="muted" style={{ fontSize: 14, margin: "6px 0 18px" }}>Tus entradas quedan guardadas en tu cuenta, en cualquier móvil. Sin contraseñas: te mandamos un código.</p>
          <LoginForm next="/perfil" />
        </section>
      ) : (
        <section className="section" style={{ display: "grid", gap: 12 }}>
          <div className="card">
            <span className="fine">Sesión iniciada como</span>
            <b style={{ display: "block", fontSize: 17, marginTop: 2, wordBreak: "break-all" }}>{user.email}</b>
          </div>
          <Link href="/entradas" className="card" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Mis entradas</span><span className="scarce">→</span>
          </Link>
          <div className="card" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Puntos y promos</span><span className="fine">Próximamente</span>
          </div>
          <SignOut to="/perfil" />
        </section>
      )}
      <p className="fine section" style={{ textAlign: "center", paddingTop: 36 }}>
        ¿Tienes un club? <Link href="/club" style={{ textDecoration: "underline" }}>la nit for clubs</Link>
      </p>
      <BottomNav />
    </main>
  );
}
