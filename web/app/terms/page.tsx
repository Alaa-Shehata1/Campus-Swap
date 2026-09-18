import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/Panel';

async function doc(name: string): Promise<string> {
  return readFile(join(process.cwd(), '..', name), 'utf8');
}

export default async function TermsPage() {
  const text = await doc('TERMS.md');
  return (
    <Container measure="readable">
      <PageHeader title="Terms of Use" description="The rules for safe, money-free exchange on CampusSwap." />
      <Panel tone="bordered">
      <pre className="whitespace-pre-wrap text-sm">
        {text}
      </pre>
      </Panel>
    </Container>
  );
}
