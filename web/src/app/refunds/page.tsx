import LegalPage from "@/components/LegalPage";
import { LEGAL, legalReady } from "@/lib/legal";

export const metadata = { title: "Refunds & cancellations | la nit", robots: { index: legalReady } };

export default function Refunds() {
  return (
    <LegalPage title="Refunds & cancellations" updated={LEGAL.updated}>
      <h2>Event cancelled</h2>
      <p>If the organiser cancels the event, you get a full refund of the amount you paid, including the service fee. We start the refund within 3 working days of the cancellation; it reaches your original payment method (UPI, card or bank) within 5–7 working days after that, depending on your bank.</p>

      <h2>Event postponed or changed</h2>
      <p>If the event moves to a new date or venue, your ticket stays valid for the new date. If you can't attend, you can ask for a full refund within 7 days of the change being announced, by writing to us with your order details.</p>

      <h2>Change of mind</h2>
      <p>Tickets are for a specific date and capacity, so they are not refundable if you simply can't go or change your mind, unless the organiser says otherwise on the event page.</p>

      <h2>Refused entry</h2>
      <p>If you are refused entry for not meeting the event's stated rules (for example age, ID or dress code shown on the event page), no refund is due. If you think you were refused wrongly, contact us within 48 hours and we will review it with the organiser.</p>

      <h2>Payment problems</h2>
      <p>If you were charged but didn't receive your ticket, or were charged twice, write to us with your payment reference. We will either send your ticket or refund the duplicate charge within 5–7 working days.</p>

      <h2>How to ask for a refund</h2>
      <p>Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>{LEGAL.phone ? ` or call/WhatsApp ${LEGAL.phone}` : ""} with your name, the email used for the purchase and the event. We reply within 2 working days.</p>
    </LegalPage>
  );
}
