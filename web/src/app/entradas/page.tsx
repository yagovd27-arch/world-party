import BottomNav from "@/components/BottomNav";
import MyTickets from "./MyTickets";

export const metadata = { title: "Mis entradas · denoche" };

export default function Entradas() {
  return (
    <main className="shell">
      <header className="top"><span className="logo">Mis entradas</span></header>
      <MyTickets />
      <BottomNav />
    </main>
  );
}
