import { Suspense } from "react";
import Callback from "./Callback";

export const metadata = { title: "la nit" };

export default function Page() {
  return (
    <main className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Suspense><Callback /></Suspense>
    </main>
  );
}
