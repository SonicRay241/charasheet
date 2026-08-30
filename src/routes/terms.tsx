import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Panel } from "@/components/terminal/panel";

export const Route = createFileRoute("/terms")({
  component: TermsOfService,
});

function TermsOfService() {
  useEffect(() => {
    document.title = "Terms of Service — charasheet";
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Link
        to="/"
        className="terminal-label inline-block cursor-pointer text-xs"
      >
        ← BACK TO CHARASHEET
      </Link>
      <Panel label="Terms of Service" className="mt-3">
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            <span className="text-foreground">Last updated:</span> August 30,
            2026
          </p>
          <section className="space-y-2">
            <p>
              By using Charasheet you agree to these terms. If you do not
              agree, do not use the app.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              The service
            </h2>
            <p>
              Charasheet is a free, offline-first D&amp;D 5e character sheet
              that runs in your browser. Character data is stored locally on
              your device, and optionally in your own Google Drive via
              bring-your-own-storage sync. There is no Charasheet server
              holding your data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Your data is your responsibility
            </h2>
            <ul className="list-inside list-disc space-y-1">
              <li>
                Your characters live in your browser's local storage. Clearing
                browser data, private browsing modes, or aggressive browser
                settings can erase them.
              </li>
              <li>
                Use Export to keep YAML backups. The cloud sync checkbox backs
                up to your own Google Drive, not to us.
              </li>
              <li>
                We cannot recover lost characters. There is no server copy to
                restore from.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Acceptable use
            </h2>
            <p>
              Don't misuse the service: no attempts to breach, overload, or
              abuse the hosting, the OAuth token relay, or Google's APIs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Google Drive
            </h2>
            <p>
              If you enable sync, you also agree to Google's Terms of
              Service. Sync access is limited to files this app created
              (drive.file scope). You can revoke access whenever at{" "}
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
              No warranty
            </h2>
            <p>
              The app is provided "as is", without warranty of any kind. D&amp;D
              5e content, rules, and terminology are used as references for a
              personal tool; Charasheet is not affiliated with or endorsed by
              Wizards of the Coast.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Limitation of liability
            </h2>
            <p>
              To the maximum extent permitted by law, we are not liable for
              any data loss, damages, or losses arising from your use of the
              app. If this term doesn't hold where you live, the app isn't
              intended for use there.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Changes
            </h2>
            <p>
              Terms may change; material updates will be reflected on this
              page with a new "last updated" date.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary">
              Contact
            </h2>
            <p>
              Questions about these terms?{" "}
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