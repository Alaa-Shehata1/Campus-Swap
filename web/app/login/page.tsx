'use client';

import { useActionState } from 'react';
import { loginAction, type ActionState } from '../actions';
import { FieldErrors } from '../../components/FieldErrors';
import { SubmitButton } from '../../components/SubmitButton';

const initial: ActionState = { errors: [] };

export default function LoginPage() {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-2xl font-bold">Log in</h1>
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <FieldErrors errors={state.errors} />
        <SubmitButton>Log in</SubmitButton>
      </form>
    </div>
  );
}
