import LegalPage from "@/components/LegalPage";
import { LEGAL, legalReady, operator } from "@/lib/legal";

export const metadata = { title: "Contact | la nit", robots: { index: legalReady } };

export default function Contact() {
  return (
    <LegalPage title="Contact us" updated={LEGAL.updated}>
      <p>Questions about an order, a refund or listing your club? We reply within 2 working days.</p>
      <dl className="facts">
        <div><dt>Email</dt><dd><a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></dd></div>
        {LEGAL.phone && <div><dt>Phone</dt><dd><a href={`tel:${LEGAL.phone.replace(/\s/g, "")}`}>{LEGAL.phone}</a><span>Calls and WhatsApp, 11:00–19:00 IST</span></dd></div>}
        <div><dt>Operator</dt><dd>{operator()}{LEGAL.address && <span>{LEGAL.address}</span>}</dd></div>
      </dl>
      <h2>About an event</h2>
      <p>For questions about the event itself (line-up, timings, entry rules), the organiser is the best contact. Their details are on the event page.</p>
      <h2>Clubs and organisers</h2>
      <p>Want to sell tickets on la nit? Register at <a href="https://clubs.lanit.club">clubs.lanit.club</a>.</p>
    </LegalPage>
  );
}
