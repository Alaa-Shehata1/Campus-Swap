import type { Metadata } from 'next';
import Link from 'next/link';
import { sessionUser } from '../lib/auth';
import { Container } from '../components/ui/Container';
import './globals.css';

export const metadata: Metadata = {
  title: 'CampusSwap — KFS student exchange',
  description: 'Exchange skills and items with KFS students. No money involved.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await sessionUser();
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-white">
          Skip to content
        </a>
        <header className="border-b border-border bg-surface-elevated">
          <Container>
            <nav aria-label="Primary" className="flex items-center gap-4 py-3">
              <Link href="/" className="text-lg font-bold text-brand-ink">
                CampusSwap
              </Link>
              <span className="text-sm text-text-muted">KFS University · money-free exchange</span>
              <span className="flex-1" />
              {user ? (
                <>
                  <Link href="/publish" className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-contrast">
                    Publish
                  </Link>
                  <Link href="/me" className="text-sm underline">
                    {user.displayName}
                  </Link>
                  <Link href="/logout" className="text-sm underline">
                    Log out
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm underline">
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-contrast"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </Container>
        </header>
        <main id="main" className="py-6">
          <Container>{children}</Container>
        </main>
        <footer className="pb-8 text-sm text-text-muted">
          <Container>
            All times Cairo time (Africa/Cairo).{' '}
            <Link href="/terms" className="underline">
              Terms
            </Link>{' '}
            ·{' '}
            <Link href="/privacy" className="underline">
              Privacy
            </Link>
          </Container>
        </footer>
      </body>
    </html>
  );
}
