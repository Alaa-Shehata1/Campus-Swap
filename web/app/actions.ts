'use server';

import { redirect } from 'next/navigation';
import { services } from '../lib/services';
import { clearSessionCookie, setSessionCookie } from '../lib/auth';
import type { FieldError } from '../../src/common/errors.js';

export interface ActionState {
  errors: FieldError[];
}

export async function signupAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { identity } = services();
  const result = await identity.register({
    email: String(form.get('email') ?? ''),
    password: String(form.get('password') ?? ''),
    displayName: String(form.get('displayName') ?? ''),
    campus: String(form.get('campus') ?? '') || undefined,
    ageConfirmed18: form.get('ageConfirmed18') === 'on',
    rulesAccepted: form.get('rulesAccepted') === 'on',
  });
  if (!result.ok) return { errors: result.errors };
  const auth = await identity.authenticate(
    String(form.get('email') ?? ''),
    String(form.get('password') ?? ''),
  );
  if (auth.ok) await setSessionCookie(auth.value.token);
  redirect('/');
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { identity } = services();
  const result = await identity.authenticate(
    String(form.get('email') ?? ''),
    String(form.get('password') ?? ''),
  );
  if (!result.ok) return { errors: result.errors };
  await setSessionCookie(result.value.token);
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  redirect('/logout');
}
