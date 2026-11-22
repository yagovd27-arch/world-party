import { requireClub } from "@/lib/auth";
import ClubTop from "../_ui/ClubTop";
import Scanner from "./Scanner";

export const metadata = { title: "Escanear QR" };

export default async function ScanPage() {
  const { club, admin } = await requireClub();
  return (
    <>
      <ClubTop active="scan" admin={admin} />
      <section className="section" style={{ maxWidth: 520 }}>
        <span className="fine">{club.name}</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>Puerta</h1>
        <Scanner />
      </section>
    </>
  );
}
