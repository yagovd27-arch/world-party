import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter-tight";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import { getT } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    metadataBase: new URL("https://www.lanit.club"),
    title: t.meta.title,
    description: t.meta.desc,
    openGraph: { siteName: "la nit", type: "website", title: t.meta.title, description: t.meta.desc },
  };
}

export const viewport: Viewport = {
  themeColor: "#1f060e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang } = await getT();
  return (
    <html lang={lang}>
      <body>
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
