export const metadata = { title: { default: "la nit for clubs", template: "%s | la nit for clubs" } };

export default function ClubLayout({ children }: LayoutProps<"/club">) {
  return <main className="shell wide club-area">{children}</main>;
}
