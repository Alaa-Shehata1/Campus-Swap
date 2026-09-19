import type { Metadata } from 'next';
import Link from 'next/link';
import { sessionUser } from '../lib/auth';
import { Container } from '../components/ui/Container';
import { DesktopNav } from '../components/navigation/DesktopNav';
import { MobileNav } from '../components/navigation/MobileNav';
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
            <DesktopNav user={user} />
            <MobileNav user={user} />
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
