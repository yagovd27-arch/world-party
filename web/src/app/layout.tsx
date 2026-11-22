import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter-tight";
import "./globals.css";

export const metadata: Metadata = {
  title: "la nit — eventos y entradas de club",
  description: "Encuentra los eventos de los mejores clubs de tu ciudad y compra tus entradas en segundos.",
};

export const viewport: Viewport = {
  themeColor: "#230810",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
