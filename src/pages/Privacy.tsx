import { Shield, Lock, Home, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FallingPapers } from "@/components/FallingPapers";

export default function Privacy() {
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
            <Lock className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm text-muted-foreground/80">Last updated: July 1, 2026</p>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
              <p>
                VexShield ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our website, dashboard, VexShield anticheat, the user search and token system, the developer Search API, and related services.
              </p>
              <p className="mt-2">
                By using VexShield services, you consent to the data practices described in this policy and agree to our Terms of Service and community standards.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1.1 Community Privacy Standards</h2>
              <p>
                Our Discord community and support channels are covered by the same privacy expectations described here and in our Terms of Service. When using VexShield services or community spaces, you must:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li><strong>Protect personal information:</strong> Do not dox or publish another person&apos;s private details (real name, address, phone, documents, etc.)</li>
                <li><strong>Respect private communications:</strong> Do not share private messages, DMs, or recordings without the consent of everyone involved</li>
                <li><strong>Stay alert to threats:</strong> Avoid suspicious links and report phishing, malware, or hacking attempts to moderators</li>
                <li><strong>Report abuse:</strong> Notify staff if you see harassment, scams, or privacy violations affecting you or others</li>
              </ul>
              <p className="mt-2">
                Violations of these standards may result in account action under our Terms, including Discord removal and license revocation. We process reports and enforcement data only as needed to protect users and the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.1 Account Information</h3>
              <p>When you create an account via Discord OAuth, we collect:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Discord user ID and username</li>
                <li>Discord avatar URL</li>
                <li>Email address (if provided by Discord)</li>
                <li>Discord guild memberships (for blacklist checking)</li>
              </ul>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.2 Server and Product Information</h3>
              <p>For servers using VexShield services, we collect:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Server IP address and port</li>
                <li>Server configuration settings</li>
                <li>License key information</li>
                <li>Server resource lists</li>
                <li>Product entitlements for VexShield</li>
              </ul>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.3 Player Data</h3>
              <p>For anti-cheat functionality, we collect:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Player identifiers (FiveM license, Steam ID, Discord ID)</li>
                <li>Player names and in-game positions</li>
                <li>Player actions and behavior patterns</li>
                <li>Screenshots when cheat detection triggers</li>
                <li>Ban and warning records</li>
                <li>Connection logs and IP addresses</li>
              </ul>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.4 Search, Token &amp; API Data</h3>
              <p>For the user search tools, token system, and developer Search API, we may collect:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Search queries you submit (Discord IDs, FiveM license hashes, or usernames) and whether a match was found</li>
                <li>Token balance, daily/purchased token activity, and the token ledger of grants and spends</li>
                <li>Search API keys stored only as a one-way hash (we never store or display the raw key), plus a short display prefix</li>
                <li>API key usage metadata such as last-used time and request counts</li>
              </ul>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.6 Usage Data</h3>
              <p>We automatically collect:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Dashboard access logs</li>
                <li>Feature usage statistics</li>
                <li>Error logs and diagnostics</li>
                <li>Browser type and device information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Provide and maintain the anti-cheat service</li>
                <li>Detect, prevent, and respond to cheating and exploitation</li>
                <li>Manage user accounts and authentication</li>
                <li>Process transactions and manage purchases and licensing</li>
                <li>Communicate service updates and security alerts</li>
                <li>Improve our detection algorithms and service quality</li>
                <li>Enforce our Terms of Service</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Information Sharing</h2>
              <p>
                We do not sell, rent, or trade your personal information. We may share information only in these limited circumstances:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>With Server Owners:</strong> Ban records and detection data for their servers</li>
                <li><strong>Cross-Server Bans:</strong> When enabled, ban information may be shared across participating servers</li>
                <li><strong>Service Providers:</strong> With trusted third parties who assist in operating our service (hosting, analytics)</li>
                <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4.1 No Reports &amp; No Police Reports</h2>
              <p>
                VexShield does not report its customers or users to the police or any law-enforcement, government, or legal authority, now or in the future. We do not file reports, criminal complaints, or police reports against you, and we do not proactively hand over your data for the purpose of reporting or pursuing users. This applies to every feature, including VexShield anticheat, the dashboard, user search and tokens, and wallet funds.
              </p>
              <p className="mt-2">
                The only narrow exception is a binding, valid court order that we cannot lawfully refuse. Even then, we do not report users proactively and limit any disclosure to the minimum strictly required.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention</h2>
              <p>We retain data according to the following guidelines:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Account Data:</strong> Retained while your account is active, deleted upon request</li>
                <li><strong>Ban Records:</strong> Retained indefinitely for security purposes</li>
                <li><strong>Player Snapshots:</strong> Retained for 7 days</li>
                <li><strong>Console Logs:</strong> Retained for 30 days</li>
                <li><strong>Screenshots:</strong> Retained for 90 days</li>
                <li><strong>Usage Logs:</strong> Retained for 12 months</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Security</h2>
              <p>
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Encryption of data in transit (TLS/SSL)</li>
                <li>Encryption of sensitive data at rest</li>
                <li>Access controls and authentication requirements</li>
                <li>Regular security audits and monitoring</li>
                <li>Secure API, database, and storage infrastructure</li>
              </ul>
              <p className="mt-2">
                While we strive to protect your information, no method of transmission or storage is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Rights and Choices</h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Request your data in a portable format</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, contact us at support@vexshield.com
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Cookies and Tracking</h2>
              <p>
                We use essential cookies for authentication and session management. We do not use advertising cookies or third-party tracking.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Third-Party Services</h2>
              <p>Our service integrates with:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Discord:</strong> For authentication and notifications</li>
                <li><strong>MySQL/API infrastructure:</strong> For dashboard data, licensing, authentication, and reports</li>
                <li><strong>FiveM:</strong> For game server integration</li>
                <li><strong>Resend:</strong> For transactional email if configured</li>
              </ul>
              <p className="mt-2">
                These services have their own privacy policies that govern their use of your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. International Data Transfers</h2>
              <p>
                Your data may be processed in countries outside your residence. We ensure appropriate safeguards are in place for such transfers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">11. Children's Privacy</h2>
              <p>
                Our service is not intended for children under 13. We do not knowingly collect data from children under 13. If you believe we have collected such data, contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">12. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy at any time, with or without prior notice. Where practical, material changes will also be communicated via email or dashboard notification. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">13. Contact Us</h2>
              <p>For privacy-related inquiries:</p>
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