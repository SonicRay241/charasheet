import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Panel } from "@/components/terminal/panel";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy — charasheet";
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Link
        to="/"
        className="terminal-label inline-block cursor-pointer text-xs"
      >
        ← BACK TO CHARASHEET
      </Link>
      <Panel label="Privacy Policy" className="mt-3">
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            <span className="text-foreground">Last updated:</span> August 30,
            2026
          </p>
          <section className="space-y-2">
            <p>
              Charasheet is an offline-first D&amp;D 5e character sheet. Your
              data lives in your browser and, if you choose to enable Google
              Drive sync, in your own Google Drive. We collect nothing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Data we do not collect
            </h2>
            <ul className="list-inside list-disc space-y-1">
              <li>
                Character data (names, stats, notes, spells, everything) is
                stored locally in your browser and never sent to us.
              </li>
              <li>
                No accounts. No analytics. No advertising. No tracking
                pixels.
              </li>
              <li>
                We do not read, scan, or index the contents of your Google
                Drive. Sync operates only on files inside the{" "}
                <span className="text-foreground">charasheet</span> folder
                that this app created, using the{" "}
                <span className="text-foreground">drive.file</span> scope —
                the narrowest Google Drive scope available.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Google Drive access
            </h2>
            <p>
              If you connect Google Drive, this app gains access limited to
              files it created (scope{" "}
              <span className="text-foreground">
                https://www.googleapis.com/auth/drive.file
              </span>
              ). File contents are exchanged directly between your browser
              and Google's servers. They are not routed through, stored on,
              or accessible to our infrastructure.
            </p>
            <p>
              You can revoke this access at any time at{" "}
              <a
                className="underline"
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
              >
                myaccount.google.com/permissions
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Server-side token exchange
            </h2>
            <p>
              To keep the OAuth client secret off your device, token
              exchanges with Google are relayed through a small serverless
              function. It sees your authorization code and access/refresh
              tokens only to perform the exchange, does not log them, and
              stores nothing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Traffic and hosting
            </h2>
            <p>
              This site is served via Vercel and Cloudflare. Like virtually
              all websites, standard server infrastructure processes request
              metadata (IP address, user agent, requested URL, timestamps)
              for security and abuse prevention. This is standard network
              traffic handled by the hosts' own privacy policies (Vercel and
              Cloudflare) — not data we collect or control.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Local storage
            </h2>
            <p>
              Characters, preferences, and your Google OAuth token are stored
              in your browser's local storage and IndexedDB. Clearing your
              browser data for this site removes all of it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Contact
            </h2>
            <p>
              Questions about this policy?{" "}
              <a
                className="underline"
                href="https://github.com/SonicRay241/charasheet/issues"
                target="_blank"
                rel="noreferrer"
              >
                Open an issue on GitHub
              </a>
              .
            </p>
          </section>
        </div>
      </Panel>
    </div>
  );
}