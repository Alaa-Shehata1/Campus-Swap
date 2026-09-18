import Link from 'next/link';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';

export default function NotFound() {
  return (
    <Panel tone="bordered">
      <PageHeader title="Not found" description="That CampusSwap page or listing is not available." />
      <Link href="/" className="font-medium underline">Return to listings</Link>
    </Panel>
  );
}
