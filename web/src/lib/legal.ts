import "server-only";

/** Datos del operador legal (los pone el socio en Vercel). Mientras falten, las páginas no se enlazan ni se indexan. */
export const LEGAL = {
  name: process.env.LEGAL_NAME?.trim() || "",
  address: process.env.LEGAL_ADDRESS?.trim() || "",
  email: process.env.CONTACT_EMAIL?.trim() || "hola@lanit.club",
  phone: process.env.CONTACT_PHONE?.trim() || "",
  updated: "23 November 2026",
};
export const legalReady = Boolean(LEGAL.name && LEGAL.address && LEGAL.phone);
export const operator = () => LEGAL.name || "[legal name of the operator]";
