import { LoginForm } from '../../components/LoginForm';
import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <Container measure="readable">
      <PageHeader title="Log in" description="Access your CampusSwap account." />
      <LoginForm returnTo={returnTo ?? '/'} />
    </Container>
  );
}
