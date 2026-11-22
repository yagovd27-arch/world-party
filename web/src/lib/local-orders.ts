/** Guarda en el móvil las entradas compradas (no hace falta cuenta). */
export type OrderRef = { id: string; key: string };
export type LocalOrder = {
  id: string;
  event: { id: string; title: string; starts: string; venue: string; city: string };
  lines: { name: string; qty: number }[];
  codes: string[];
};

const REFS = "denoche-orders";
const LOCAL = "denoche-local-orders";

function read<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) ?? "[]") as T[]; } catch { return []; }
}
function write<T>(k: string, v: T[]) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
}

export const getOrderRefs = () => read<OrderRef>(REFS);
export const getLocalOrders = () => read<LocalOrder>(LOCAL);
export function saveOrderRef(r: OrderRef) {
  write(REFS, [r, ...getOrderRefs().filter((x) => x.id !== r.id)]);
}
export function saveLocalOrder(o: LocalOrder) {
  write(LOCAL, [o, ...getLocalOrders().filter((x) => x.id !== o.id)]);
}
