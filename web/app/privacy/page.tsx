import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/Panel';

export default async function PrivacyPage() {
  const text = await readFile(join(process.cwd(), '..', 'PRIVACY.md'), 'utf8');
  return (
    <Container measure="readable">
      <PageHeader title="Privacy Notice" description="How CampusSwap minimizes and protects personal data." />
      <Panel tone="bordered">
      <pre className="whitespace-pre-wrap text-sm">
        {text}
      </pre>
      </Panel>
    </Container>
  );
}
