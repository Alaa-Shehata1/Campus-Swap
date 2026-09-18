import { redirect } from 'next/navigation';
import { formatCairoTime } from '../../../src/common/cairoTime.js';
import { services } from '../../lib/services';
import { sessionUserId } from '../../lib/auth';
import { ProfileForm } from '../../components/ProfileForm';
import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';

export default async function MePage() {
  const userId = await sessionUserId();
  if (!userId) redirect('/login?returnTo=/me');
  const { identity, listings } = services();
  const user = await identity.getProfile(userId);
  if (!user) redirect('/login?returnTo=/me');
  const activeCount = await listings.store.countActiveByOwner(userId);
  return (
    <Container measure="readable" className="space-y-6">
      <div>
        <PageHeader title={user.displayName} description={`${user.campus} (self-declared, not verified)`} />
        <p className="mt-1 text-sm text-text-muted">
          Joined{' '}
          <time>{formatCairoTime(user.joinDate)}</time>
        </p>
        {user.restriction !== 'none' && (
          <p role="status" className="mt-2 inline-block rounded-md bg-status-danger-bg px-2 py-0.5 text-sm font-medium text-status-danger-ink">
            Account status: {user.restriction}
          </p>
        )}
        <p className="mt-1 text-sm text-text-muted">{activeCount} active listings (max 20)</p>
      </div>
      <ProfileForm user={user} />
    </Container>
  );
}
