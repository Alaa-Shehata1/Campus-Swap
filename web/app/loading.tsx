import { Panel } from '../components/ui/Panel';

export default function Loading() {
  return <Panel tone="sunken"><p role="status" aria-live="polite">Loading CampusSwap…</p></Panel>;
}
