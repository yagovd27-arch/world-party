import LegalPage from "@/components/LegalPage";
import { LEGAL, legalReady, operator } from "@/lib/legal";
import { SERVICE_FEE_RATE } from "@/lib/types";

export const metadata = { title: "Terms of use · la nit", robots: { index: legalReady } };

export default function Terms() {
  const fee = Math.round(SERVICE_FEE_RATE * 100);
  return (
    <LegalPage title="Terms of use" updated={LEGAL.updated}>
      <p>These terms apply to lanit.club and clubs.lanit.club (“la nit”), operated by {operator()}{LEGAL.address ? `, ${LEGAL.address}` : ""} (“we”, “us”). By using la nit or buying a ticket you accept them.</p>

      <h2>What la nit does</h2>
      <p>la nit is a platform where clubs, venues and event organisers (“organisers”) publish events and sell tickets. We sell tickets on behalf of the organiser. The organiser is responsible for the event itself: line-up, timings, venue, entry rules, safety and anything that happens at the event.</p>

      <h2>Buying tickets</h2>
      <ul>
        <li>Prices are shown in the local currency and include the ticket price set by the organiser plus a la nit service fee of {fee}% of the ticket price, shown before you pay.</li>
        <li>Your order is confirmed only once payment is received. You then get your tickets with QR codes on screen and by email.</li>
        <li>Each QR code is valid for one person and one entry. Do not share or resell it: the first scan is the one that counts.</li>
        <li>You can buy up to 10 tickets of each type per order.</li>
      </ul>

      <h2>Entry to events</h2>
      <ul>
        <li>The organiser and venue keep the right of admission. They may refuse entry for reasons such as age, intoxication, dress code, behaviour or capacity.</li>
        <li>Events marked 18+ or 21+ require valid photo ID at the door. Local drinking-age laws apply.</li>
        <li>Arrive with your QR ready on your phone or printed.</li>
      </ul>

      <h2>Changes and cancellations</h2>
      <p>If an event is cancelled, postponed or materially changed, see our <a href="/refunds">Refunds &amp; cancellations</a> policy.</p>

      <h2>Organisers</h2>
      <p>Organisers using la nit for clubs confirm they are authorised to sell tickets for their events, that event details are accurate, and that they will honour every valid ticket. We may verify organisers, unpublish events and suspend accounts that break these terms.</p>

      <h2>Acceptable use</h2>
      <p>Don't misuse la nit: no fraud, fake orders, scraping, reselling tickets above face value through la nit, or attempts to break the site.</p>

      <h2>Liability</h2>
      <p>We are responsible for selling and delivering your ticket. To the extent the law allows, we are not liable for the event itself, which is the organiser's responsibility. Nothing in these terms limits rights you have under Indian consumer protection law.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India. Courts at {LEGAL.address ? LEGAL.address.split(",").slice(-2, -1)[0]?.trim() || "the operator's city" : "the operator's city"} have jurisdiction.</p>

      <h2>Contact</h2>
      <p>Questions: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>{LEGAL.phone ? `, ${LEGAL.phone}` : ""}. See <a href="/contact">Contact</a>.</p>
    </LegalPage>
  );
}
