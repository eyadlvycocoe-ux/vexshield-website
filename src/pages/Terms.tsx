import { Shield, FileText, Home, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FallingPapers } from "@/components/FallingPapers";

export default function Terms() {
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
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Terms of Service</h1>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm text-muted-foreground/80">Last updated: July 1, 2026</p>

            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-foreground">
              <p className="font-semibold">Agreement by use</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Using or purchasing any VexShield or VexShield product means you fully agree to these Terms, our Privacy Policy, and Conditions of Sale. No separate consent form is required.
              </p>
            </div>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using the VexShield website, dashboard, VexShield anticheat, and related services ("Service"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use our Service.
              </p>
              <p>
                These Terms apply to all users of the Service, including website visitors, purchasers, server owners, administrators, support users, and players who interact with protected servers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
              <p>These Terms cover the entire VexShield service and features, including:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>VexShield anti-cheat protection for FiveM game servers</li>
                <li>Real-time player monitoring and heuristic detection systems</li>
                <li>Web-based dashboard for server management</li>
                <li>Ban management and player tracking tools</li>
                <li>In-game administrative menu and management tools</li>
                <li>User search / lookup tools and the token system used to perform searches</li>
                <li>The developer Search API and personal API keys used to run searches from your own projects</li>
                <li>Wallet funds (account balance) used to pay for products, renewals, and tokens</li>
                <li>Discord integration for notifications and user verification</li>
                <li>API access for server and third-party integration</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. License and Use Rights</h2>
              <p>
                Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to use the purchased products for your authorized server(s), account, or scan workflow.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li><strong>Personal license only:</strong> Do not share, leak, resell, or sell your license key, Search API key, or account access</li>
                <li><strong>One license per server:</strong> Each license works on only one server unless we explicitly authorize otherwise in writing</li>
                <li><strong>Account ban = license ban:</strong> If your Discord account or VexShield account is banned for rule or Terms violations, all associated licenses and entitlements are revoked</li>
              </ul>
              <p className="mt-2">Under this license, you may NOT:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Modify, decompile, reverse engineer, crack, or disassemble VexShield software, scripts, scanners, or dashboard code</li>
                <li>Share, resell, leak, or redistribute your license key or Search API key</li>
                <li>Attack, probe, disrupt, or attempt to compromise VexShield servers, tools, APIs, or infrastructure</li>
                <li>Use the Service to develop competing products</li>
                <li>Attempt to bypass or circumvent any security measures</li>
                <li>Use the Service for any illegal purposes</li>
                <li>Remove or alter any copyright or proprietary notices</li>
              </ul>
              <p className="mt-2 font-semibold text-foreground">
                Attempting to crack or reverse-engineer VexShield protections may result in immediate license revocation and, where applicable, legal action.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3.1 Community &amp; Discord Conduct</h2>
              <p>
                If you join our Discord community or interact with VexShield staff, you must also follow these community standards. Violations may result in Discord removal, account suspension, and license revocation.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li><strong>Keep personal info private:</strong> Doxing or sharing others&apos; personal information is strictly forbidden</li>
                <li><strong>Think before clicking:</strong> Do not post or spread suspicious links. Malware, phishing, and hacking attempts are not allowed</li>
                <li><strong>No NSFW content:</strong> Explicit, adult, or inappropriate content is prohibited</li>
                <li><strong>Zero tolerance for cheating or scamming:</strong> Hacks, exploits, scams, or testing cheats against VexShield result in immediate bans</li>
                <li><strong>Report threats:</strong> Report suspicious activity to moderators promptly</li>
                <li><strong>Respect privacy:</strong> Sharing private messages or recordings without consent is not allowed</li>
                <li><strong>Stay civil:</strong> Harassment, bullying, or excessive swearing will not be tolerated</li>
                <li><strong>Follow staff orders:</strong> Moderators and admins enforce the rules; disobeying them may lead to bans</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3.2 Anti-Cheat Testing &amp; Experimentation</h2>
              <p className="font-semibold text-foreground">
                VexShield is not a playground for cheats, bypasses, or security research without our prior written authorization.
              </p>
              <p className="mt-2">
                Any user who obtains the anti-cheat and attempts to test, reverse, experiment with, or probe it - even if their stated intention is to cooperate with us - will have their license permanently and automatically banned.
              </p>
              <p className="mt-2 text-sm">
                If you believe you have found a legitimate security issue, contact us through official support channels only. Do not test protections on live systems without explicit written approval.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Account Registration</h2>
              <p>
                To use certain features, you must create an account using Discord OAuth. You agree to provide accurate information and maintain the security of your account. You are responsible for all activities under your account.
              </p>
              <p className="mt-2">
                We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Service Availability and Modifications</h2>
              <p>
                We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. We may modify, suspend, or discontinue any aspect of the Service at any time without liability. We will provide reasonable notice for significant changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Payment Methods, OxaPay Crypto &amp; Order Processing</h2>
              <p>
                All purchases are processed in EUR unless explicitly stated otherwise during checkout. We support automated Cryptocurrency payments processed via <strong>OxaPay</strong> (oxapay.com), as well as manual payment options including <strong>PayPal</strong>, <strong>Bank Transfer</strong>, and <strong>CashPlus</strong>.
              </p>
              
              <div className="mt-3 space-y-3 text-sm">
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <h3 className="font-bold text-amber-400 mb-1">6.1 Cryptocurrency Payments (OxaPay)</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Cryptocurrency payments are processed through OxaPay's secure gateway (supporting BTC, ETH, USDT, SOL, TRX, LTC, BNB, and other major tokens).</li>
                    <li><strong>Blockchain Finality:</strong> All cryptocurrency payments are irreversible once broadcast onto the network. You must ensure exact transaction amounts and correct wallet addresses.</li>
                    <li><strong>Automated License Provisioning:</strong> Upon verified blockchain payment confirmation via OxaPay webhooks, your anti-cheat license and server configuration will be automatically generated and bound to your specified Server Name and IP.</li>
                    <li>Underpayments or payments sent past invoice expiration (typically 60 minutes) may require manual support verification to resolve.</li>
                  </ul>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <h3 className="font-bold text-sky-400 mb-1">6.2 Manual Payment Methods (PayPal, Bank, CashPlus)</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>If you select PayPal, Bank Transfer, or CashPlus, an order request will be created in pending status.</li>
                    <li>You must provide proof of payment by opening a support ticket in our official Discord community quoting your generated Order Number.</li>
                    <li>License activation occurs within 24 hours following staff payment verification. If an order is refused or unpaid, it will be marked as denied.</li>
                  </ul>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <h3 className="font-bold text-emerald-400 mb-1">6.3 Coupon Codes &amp; Promotional Discounts</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Valid coupon codes and active site promotions are automatically calculated at checkout prior to payment generation.</li>
                    <li>Coupons are non-transferable, subject to usage limits, target product restrictions, and expiration dates.</li>
                  </ul>
                </div>
              </div>

              <p className="mt-4 font-semibold text-foreground">
                All sales are strictly final. We do not provide refunds, exchanges, returns, partial refunds, or store credit for any anti-cheat product, plan, bundle, renewal, add-on, wallet funds (account balance), or search tokens, once issued, granted, or added — without exception.
              </p>
              <p className="mt-2 text-sm">
                Wallet funds and search tokens are prepaid, non-refundable, and non-withdrawable. Attempting a chargeback or payment reversal on any payment provider will result in instant license revocation, server blacklist, and permanent ban.
              </p>
            </section>


            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. User Responsibilities</h2>
              <p>As a user, you agree to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Use the Service only for lawful purposes</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Maintain accurate server configuration</li>
                <li>Not interfere with other users' access to the Service</li>
                <li>Report any security vulnerabilities responsibly</li>
                <li>Accept responsibility for actions taken by staff with access to your dashboard</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Prohibited Activities</h2>
              <p>The following are strictly prohibited on the website, dashboard, Discord, and all VexShield services:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Attempting to exploit, hack, attack, or manipulate the Service or its infrastructure</li>
                <li>Using the Service to facilitate cheating, exploitation, or cheat testing</li>
                <li>Harassment, abuse, doxing, or threats against other users or staff</li>
                <li>Impersonating VexShield staff or representatives</li>
                <li>Violating the intellectual property rights of others</li>
                <li>Transmitting malware, viruses, phishing links, or harmful code</li>
                <li>Creating fake evidence or abusing detection, scan, search, or token systems</li>
                <li>Scamming, fraud, chargeback abuse, or license sharing</li>
              </ul>
              <p className="mt-3 font-semibold text-destructive">
                Breaking any rule or term in these Terms may result in a Discord ban and immediate license revocation, without refund.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Intellectual Property</h2>
              <p>
                All content, software, and materials provided through the Service are owned by VexShield or its licensors and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute any part of our Service without explicit permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE. NO ANTI-CHEAT, PC CHECK, FILE SCAN, OR BACKDOOR SCAN SYSTEM IS 100% EFFECTIVE, AND WE DO NOT GUARANTEE DETECTION OF ALL CHEATS, EXPLOITS, MALWARE, OR UNSAFE RESOURCES.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">11. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, VEXSHIELD SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">12. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless VexShield, its officers, employees, and agents from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">13. Termination &amp; Enforcement</h2>
              <p>
                We may terminate or suspend your access to the Service at any time for violation of these Terms, community rules, or fraudulent activity. Upon termination, your right to use the Service ceases immediately.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>A Discord ban for VexShield rule violations may revoke all linked licenses and entitlements</li>
                <li>License revocation is automatic for cracking, reverse engineering, cheat testing, or system attacks</li>
                <li>Terminated accounts receive no refunds for licenses, tokens, or wallet funds</li>
              </ul>
              <p className="mt-2">
                Sections regarding intellectual property, disclaimers, and limitations of liability survive termination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">14. Changes to Terms</h2>
              <p>
                VexShield reserves the right to modify these Terms, community rules, and related policies at any time, with or without prior notice. Where practical, material changes will also be communicated via email or dashboard notification. Continued use of the Service after changes constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">15. No Reports &amp; No Police Reports</h2>
              <p>
                VexShield does not file reports, complaints, or police/criminal reports against its customers or users, now or in the future. This applies to the entire website and every feature, including VexShield anticheat, the dashboard, user search and tokens, wallet funds, support records, and account activity.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>We will not report you, your server, or your account to the police or any law-enforcement, government, or legal authority</li>
                <li>We will not initiate police reports, criminal complaints, lawsuits, or other legal proceedings against you for using our products</li>
                <li>We do not act as a reporting or enforcement authority  -  detections, scans, and bans are tools you use inside your own community at your own discretion</li>
                <li>We do not sell or hand over your data to third parties for the purpose of reporting or pursuing users</li>
                <li>You remain solely responsible for how you use VexShield products within your own server and jurisdiction</li>
              </ul>
              <p className="mt-2">
                The only narrow exception is where we are compelled by a binding, valid court order that we cannot lawfully refuse; even then, we do not proactively report users and limit any disclosure to the minimum strictly required by that order.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">16. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved through binding arbitration or in courts of competent jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">17. Developer &amp; Development Team Declaration</h2>
              <p>
                VexShield and all associated software products and services are officially created, engineered, and maintained by a Moroccan development team based in the Kingdom of Morocco 🇲🇦 .
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                This official statement serves as definitive proof that all core software architecture, anti-cheat security engineering, and web infrastructure for VexShield originate from a Moroccan development team.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">18. Contact Information</h2>
              <p>For questions about these Terms, contact us at:</p>
              <p className="text-foreground mt-2">
                Email: support@vexshield.com<br />
                Discord: https://discord.gg/5WgtMWbtgD
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}
