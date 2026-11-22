import LegalPage from "@/components/LegalPage";
import { LEGAL, legalReady, operator } from "@/lib/legal";

export const metadata = { title: "Privacy policy · la nit", robots: { index: legalReady } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated={LEGAL.updated}>
      <p>This policy explains what personal data la nit collects and how we use it. The data controller is {operator()}{LEGAL.address ? `, ${LEGAL.address}` : ""}. We follow India's Digital Personal Data Protection Act, 2023.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>When you buy:</b> your name, email, phone number, the tickets you bought and the payment reference.</li>
        <li><b>When you create an account:</b> your email address.</li>
        <li><b>Clubs and organisers:</b> club name, city, area, Instagram, phone and the email of the people who manage it.</li>
        <li><b>Technical:</b> cookies needed for the site to work (sign-in session, chosen city and language) and your approximate city from your connection, used only to show nearby events.</li>
      </ul>
      <p>We do not see or store your card or UPI details. Payments are processed by our payment provider (Razorpay), under its own privacy policy.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To issue your tickets, send them to you and let you see them in your account.</li>
        <li>To let the organiser check you in at the door and contact you about the event (for example a change of time).</li>
        <li>To give refunds and answer your questions.</li>
        <li>To prevent fraud and keep the service secure.</li>
      </ul>
      <p>We don't sell your data and we don't send marketing without your consent.</p>

      <h2>Who we share it with</h2>
      <ul>
        <li>The organiser of the event you bought tickets for (name, email, phone, tickets).</li>
        <li>Service providers that run la nit for us: hosting (Vercel), database (Supabase), email (Resend) and payments (Razorpay).</li>
        <li>Authorities, when the law requires it.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>Order data is kept for up to 8 years for accounting and tax purposes. Account data is kept while your account is active; ask us and we will delete it, except what we must keep by law.</p>

      <h2>Your rights</h2>
      <p>You can ask to access, correct or delete your personal data, or withdraw consent, by writing to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. We reply within 30 days. You can also complain to the Data Protection Board of India.</p>

      <h2>Contact</h2>
      <p>Grievance contact: {operator()}, <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>{LEGAL.phone ? `, ${LEGAL.phone}` : ""}.</p>
    </LegalPage>
  );
}
