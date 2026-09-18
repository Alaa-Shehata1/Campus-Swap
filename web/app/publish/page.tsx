import { redirect } from 'next/navigation';
import { sessionUserId } from '../../lib/auth';
import { PublishForm } from '../../components/PublishForm';
import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';

export default async function PublishPage() {
  const userId = await sessionUserId();
  if (!userId) redirect('/login?returnTo=/publish');
  return (
    <Container measure="readable">
      <PageHeader title="Publish a listing" description="Offer a skill or item, or request what you need." />
      <PublishForm />
    </Container>
  );
}
