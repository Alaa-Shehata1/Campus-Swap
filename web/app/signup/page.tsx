import { SignupForm } from '../../components/SignupForm';
import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <Container measure="readable">
      <PageHeader title="Sign up" description="Create an account to publish and exchange." />
      <SignupForm returnTo={returnTo ?? '/'} />
    </Container>
  );
}
