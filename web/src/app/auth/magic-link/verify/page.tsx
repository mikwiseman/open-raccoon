import { Suspense } from 'react';
import { MagicLinkVerifyClient } from './MagicLinkVerifyClient';

export default function MagicLinkVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell auth-shell">
          <section className="auth-card" aria-label="magic-link-verify-page">
            <header className="panel-header">
              <h2>Magic Link Verification</h2>
              <p>Preparing verification…</p>
            </header>
            <p className="info-banner">Please wait…</p>
          </section>
        </main>
      }
    >
      <MagicLinkVerifyClient />
    </Suspense>
  );
}
