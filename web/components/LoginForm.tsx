'use client';

import { useActionState } from 'react';
import { loginAction, type ActionState } from '../app/actions';
import { FieldErrors } from './FieldErrors';
import { SubmitButton } from './SubmitButton';
import { FormField } from './ui/FormField';
import { Panel } from './ui/Panel';

const initial: ActionState = { errors: [] };

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <Panel tone="bordered"><form action={action} className="space-y-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <FormField id="email" label="Email">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2"
        />
      </FormField>
      <FormField id="password" label="Password">
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2"
        />
      </FormField>
      <FieldErrors errors={state.errors} />
      <SubmitButton>Log in</SubmitButton>
    </form></Panel>
  );
}
