'use client';

import { useActionState } from 'react';
import { respondAction, withdrawAction, type ActionState } from '../app/actions';
import { Disclaimer } from './Disclaimer';
import { FieldErrors } from './FieldErrors';
import { SubmitButton } from './SubmitButton';

const initial: ActionState = { errors: [] };

function DecisionButtons({ proposalId }: { proposalId: string }) {
  const [state, action] = useActionState(respondAction, initial);
  return (
    <div className="space-y-3">
      <Disclaimer flow="proposal-accept" />
      <div className="flex flex-wrap gap-3">
        <form action={action}>
          <input type="hidden" name="proposalId" value={proposalId} />
          <input type="hidden" name="decision" value="accept" />
          <SubmitButton>Accept proposal</SubmitButton>
        </form>
        <form action={action}>
          <input type="hidden" name="proposalId" value={proposalId} />
          <input type="hidden" name="decision" value="decline" />
          <button
            type="submit"
            className="rounded-md border border-border bg-surface-elevated px-4 py-2 font-medium text-text-primary"
          >
            Decline
          </button>
        </form>
      </div>
      <FieldErrors errors={state.errors} />
    </div>
  );
}

function WithdrawButton({ proposalId }: { proposalId: string }) {
  const [state, action] = useActionState(withdrawAction, initial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      <button
        type="submit"
        className="rounded-md border border-border bg-surface-elevated px-4 py-2 font-medium text-text-primary"
      >
        Withdraw proposal
      </button>
      <FieldErrors errors={state.errors} />
    </form>
  );
}

/** Counterparty accept/decline + either-side withdraw for a Proposed proposal. */
export function ProposalActions({
  proposalId,
  isCounterparty,
}: {
  proposalId: string;
  isCounterparty: boolean;
}) {
  return (
    <div className="space-y-4">
      {isCounterparty && <DecisionButtons proposalId={proposalId} />}
      <WithdrawButton proposalId={proposalId} />
    </div>
  );
}
