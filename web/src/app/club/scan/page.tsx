import { requireClub } from "@/lib/auth";
import ClubTop from "../_ui/ClubTop";
import Scanner from "./Scanner";
import { getT } from "@/lib/lang";

export const metadata = { title: { absolute: "la nit for clubs" } };

export default async function ScanPage() {
  const { club, admin } = await requireClub();
  const { t } = await getT();
  return (
    <>
      <ClubTop active="scan" admin={admin} />
      <section className="section" style={{ maxWidth: 520 }}>
        <span className="fine">{club.name}</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>{t.club.door}</h1>
        <Scanner />
      </section>
    </>
  );
}
