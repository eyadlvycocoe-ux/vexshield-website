import { Shield, CreditCard, Home, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FallingPapers } from "@/components/FallingPapers";

export default function Refund() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />
      <FallingPapers />
      <div className="max-w-4xl mx-auto relative z-10 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <img src="/logo.png" alt="VexShield" className="h-8 w-auto" />
            <span className="text-lg font-bold text-white">VexShield</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white"
          >
            <Home className="h-4 w-4 mr-1.5 text-sky-400" />
            Back to Home
          </Button>
        </div>

        <Card className="bg-card/80 border-border/50 backdrop-blur-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Conditions of Sale</h1>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm text-muted-foreground/80">Last updated: July 1, 2026</p>
            
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30 mb-6">
              <p className="text-foreground font-bold text-lg">
                NO REFUNDS POLICY - ALL SALES ARE FINAL
              </p>
            </div>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Digital Goods</h2>
              <p>
                All products sold by VexShield are digital goods, including VexShield anticheat software licenses, scripts, downloads, dashboard access, search tokens, Search API usage, wallet funds (account balance), and access to cloud services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. NO REFUND POLICY</h2>
              <p className="font-semibold text-foreground">
                Due to the nature of digital goods and instant delivery, we strictly do not offer refunds, exchanges, returns, partial refunds, or store credit once a license, product entitlement, download, dashboard access, search tokens, or wallet funds have been issued, granted, or added. This applies to all VexShield products, plans, renewals, add-ons, tokens, and funds, without exception.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2.1 Wallet Funds &amp; Search Tokens</h2>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Wallet funds (account balance) are prepaid, non-refundable, and non-withdrawable; they can only be spent inside VexShield</li>
                <li>Search tokens are non-refundable and have no cash value; purchased tokens never expire but cannot be converted back to funds or money</li>
                <li>Daily tokens are provided automatically based on your plan and reset each day at 12:00 (noon) UTC; they do not carry over and are not refundable</li>
                <li>Tokens spent through the Search API are consumed in the same way as website searches and are equally non-refundable</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Instant Delivery</h2>
              <p>
                License keys, product access, and downloads may be delivered instantly upon successful payment. You are responsible for ensuring your email address, Discord account, and server details are correct before purchase.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. License Usage</h2>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Licenses are personal, for the authorized purchaser only, and may not be shared, leaked, resold, sublicensed, or distributed</li>
                <li><strong>One license per server:</strong> Each license works on only one server unless we explicitly authorize otherwise</li>
                <li>HWID, server, account, or entitlement locking may apply depending on the product</li>
                <li>We reserve the right to revoke access for license abuse, chargebacks, fraud, Terms violations, Discord bans, cracking, reverse engineering, cheat testing, or attacks on our systems</li>
                <li>If your Discord or VexShield account is banned for rule violations, associated licenses are revoked with no refund</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Payment Methods &amp; Cryptocurrency Terms</h2>
              <p>
                We accept automated Cryptocurrency payments via <strong>OxaPay</strong> (oxapay.com), as well as manual payment methods including <strong>PayPal</strong>, <strong>Bank Transfer</strong>, and <strong>CashPlus</strong>.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1.5 mt-2">
                <li><strong>Cryptocurrency Payments (OxaPay):</strong> Cryptocurrency transactions (BTC, ETH, USDT, SOL, TRX, LTC, BNB, etc.) are processed directly on their respective blockchains. Due to the immutable nature of distributed ledgers, crypto payments are final, non-refundable, and cannot be reversed or cancelled once submitted.</li>
                <li><strong>Exact Amount &amp; Network Fees:</strong> You are responsible for ensuring the exact invoice amount is transferred plus any applicable network miner/gas fees. Underpaid invoices will remain pending until fully settled.</li>
                <li><strong>Manual Payments (PayPal / Bank / CashPlus):</strong> Manual payment requests require order verification by support staff in Discord using your Order Number. Licenses are activated upon manual confirmation of funds receipt.</li>
              </ul>
            </section>


            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Renewals</h2>
              <p>
                Renewals are manual (no automatic recurring billing):
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>You choose when to renew and pay each time</li>
                <li>Renewal is available in the last 5 days before expiry, or up to 5 days after expiry</li>
                <li>After the grace period, expired licenses may be permanently deleted</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Chargebacks</h2>
              <p>
                We strongly encourage you to contact us before initiating a chargeback with your bank or payment provider.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Chargebacks without prior communication may result in permanent account suspension</li>
                <li>We actively dispute fraudulent chargebacks with evidence</li>
                <li>Users who initiate chargebacks may be blacklisted from future purchases</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. No Reports &amp; No Police Reports</h2>
              <p>
                VexShield does not file reports, complaints, or police/criminal reports against its customers or users, now or in the future, for purchasing or using any VexShield product or feature. We do not report you to the police or any law-enforcement, government, or legal authority. See our Terms of Service and Privacy Policy for the full policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Support</h2>
              <p>
                Support is provided via Discord and the Help Center. We do not offer support for unauthorized modifications or third-party software.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to Pricing &amp; Policies</h2>
              <p>
                We reserve the right to modify pricing, bundles, product availability, renewal offers, and sale conditions at any time, with or without prior notice. Price or policy changes do not create a right to a refund for previous purchases. See our Terms of Service for full community rules and enforcement.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}
