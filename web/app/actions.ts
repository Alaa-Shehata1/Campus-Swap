'use server';

import { redirect } from 'next/navigation';
import { services } from '../lib/services';
import { sessionUserId, setSessionCookie } from '../lib/auth';
import { cairoWallToISO } from '../lib/cairo';
import type { FieldError } from '../../src/common/errors.js';

export interface ActionState {
  errors: FieldError[];
}

function safeReturnTo(form: FormData): string {
  const raw = String(form.get('returnTo') ?? '/');
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
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
  redirect(safeReturnTo(form));
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { identity } = services();
  const result = await identity.authenticate(
    String(form.get('email') ?? ''),
    String(form.get('password') ?? ''),
  );
  if (!result.ok) return { errors: result.errors };
  await setSessionCookie(result.value.token);
  redirect(safeReturnTo(form));
}

export interface PublishState {
  errors: FieldError[];
}

export async function publishAction(_prev: PublishState, form: FormData): Promise<PublishState> {
  const userId = await sessionUserId();
  if (!userId) redirect('/login?returnTo=/publish');
  const { listings } = services();
  const kind = String(form.get('kind') ?? 'skill');
  const modality = String(form.get('modality') ?? '');
  const result = await listings.publish(userId, {
    side: String(form.get('side') ?? 'offer') as 'offer' | 'request',
    kind: kind as 'skill' | 'item',
    title: String(form.get('title') ?? ''),
    description: String(form.get('description') ?? ''),
    category: String(form.get('category') ?? ''),
    zone: String(form.get('zone') ?? ''),
    availability: String(form.get('availability') ?? '') || undefined,
    images: [],
    modality: (kind === 'item' ? modality : undefined) as 'lend' | 'give' | 'swap' | undefined,
    returnTerm: String(form.get('returnTerm') ?? '') || undefined,
    counterpartDescription: String(form.get('counterpartDescription') ?? '') || undefined,
  });
  if (!result.ok) return { errors: result.errors };
  redirect(`/listings/${result.value.id}`);
}

export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await sessionUserId();
  if (!userId) redirect('/login?returnTo=/me');
  const { identity } = services();
  const result = await identity.updateProfile(userId, {
    displayName: String(form.get('displayName') ?? ''),
    bio: String(form.get('bio') ?? ''),
    skillTags: String(form.get('skillTags') ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    availabilityNotes: String(form.get('availabilityNotes') ?? ''),
  });
  if (!result.ok) return { errors: result.errors };
  redirect('/me');
}

export async function proposeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await sessionUserId();
  const target = String(form.get('targetListingId') ?? '');
  if (!userId) redirect(`/login?returnTo=/proposals/new?listing=${encodeURIComponent(target)}`);
  const { exchanges } = services();
  const result = await exchanges.propose(userId, {
    sideAListingIds: form.getAll('sideA').map(String).filter(Boolean),
    sideBListingIds: [target],
    terms: String(form.get('terms') ?? ''),
  });
  if (!result.ok) return { errors: result.errors };
  redirect(`/proposals/${result.value.id}`);
}

export async function respondAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await sessionUserId();
  const proposalId = String(form.get('proposalId') ?? '');
  if (!userId) redirect(`/login?returnTo=/proposals/${encodeURIComponent(proposalId)}`);
  const decision = String(form.get('decision') ?? '');
  if (decision !== 'accept' && decision !== 'decline') {
    return { errors: [{ code: 'invalid', field: 'decision', message: 'Choose accept or decline.' }] };
  }
  const { exchanges } = services();
  const result = await exchanges.respond(userId, proposalId, decision);
  if (!result.ok) return { errors: result.errors };
  if (decision === 'accept' && typeof result.value === 'object' && 'exchange' in result.value) {
    redirect(`/exchanges/${result.value.exchange.id}`);
  }
  redirect('/proposals');
}

export async function withdrawAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await sessionUserId();
  const proposalId = String(form.get('proposalId') ?? '');
  if (!userId) redirect(`/login?returnTo=/proposals/${encodeURIComponent(proposalId)}`);
  const { exchanges } = services();
  const result = await exchanges.withdraw(userId, proposalId);
  if (!result.ok) return { errors: result.errors };
  redirect('/proposals');
}

export async function scheduleAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await sessionUserId();
  const exchangeId = String(form.get('exchangeId') ?? '');
  if (!userId) redirect(`/login?returnTo=/exchanges/${encodeURIComponent(exchangeId)}`);
  const raw = String(form.get('at') ?? '');
  const at = cairoWallToISO(raw);
  if (!at) {
    return { errors: [{ code: 'schedule-invalid', field: 'at', message: 'Provide a valid date and time.' }] };
  }
  const { exchanges } = services();
  const result = await exchanges.schedule(userId, exchangeId, {
    at,
    place: String(form.get('place') ?? ''),
    acknowledgedSafetyReminder: form.get('ack') === 'on',
  });
  if (!result.ok) return { errors: result.errors };
  redirect(`/exchanges/${exchangeId}`);
}

export async function markDoneAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await sessionUserId();
  const exchangeId = String(form.get('exchangeId') ?? '');
  if (!userId) redirect(`/login?returnTo=/exchanges/${encodeURIComponent(exchangeId)}`);
  const { exchanges } = services();
  const override = String(form.get('overrideReason') ?? '').trim();
  const result = await exchanges.markDone(userId, exchangeId, override ? { overrideReason: override } : {});
  if (!result.ok) return { errors: result.errors };
  redirect(`/exchanges/${exchangeId}`);
}

export async function confirmAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await sessionUserId();
  const exchangeId = String(form.get('exchangeId') ?? '');
  if (!userId) redirect(`/login?returnTo=/exchanges/${encodeURIComponent(exchangeId)}`);
  const { exchanges } = services();
  const result = await exchanges.confirm(userId, exchangeId);
  if (!result.ok) return { errors: result.errors };
  redirect(`/exchanges/${exchangeId}`);
}

export async function disputeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await sessionUserId();
  const exchangeId = String(form.get('exchangeId') ?? '');
  if (!userId) redirect(`/login?returnTo=/exchanges/${encodeURIComponent(exchangeId)}`);
  const { exchanges } = services();
  const result = await exchanges.dispute(userId, exchangeId);
  if (!result.ok) return { errors: result.errors };
  redirect(`/exchanges/${exchangeId}`);
}

export async function cancelAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await sessionUserId();
  const exchangeId = String(form.get('exchangeId') ?? '');
  if (!userId) redirect(`/login?returnTo=/exchanges/${encodeURIComponent(exchangeId)}`);
  const reason = String(form.get('reason') ?? '');
  const valid = ['no-show', 'conflict', 'item-unavailable', 'safety-concern', 'other'];
  if (!valid.includes(reason)) {
    return {
      errors: [{
        code: 'invalid', field: 'reason',
        message: 'Cancellation requires a reason: no-show, conflict, item-unavailable, safety-concern, or other.',
      }],
    };
  }
  const { exchanges } = services();
  const detail = String(form.get('detail') ?? '').trim();
  const result = await exchanges.cancel(userId, exchangeId, {
    reason: reason as 'no-show' | 'conflict' | 'item-unavailable' | 'safety-concern' | 'other',
    ...(detail ? { detail } : {}),
  });
  if (!result.ok) return { errors: result.errors };
  redirect(`/exchanges/${exchangeId}`);
}

export async function postMessageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await sessionUserId();
  const exchangeId = String(form.get('exchangeId') ?? '');
  if (!userId) redirect(`/login?returnTo=/exchanges/${encodeURIComponent(exchangeId)}`);
  const { exchanges } = services();
  const result = await exchanges.postMessage(userId, exchangeId, String(form.get('text') ?? ''));
  if (!result.ok) return { errors: result.errors };
  redirect(`/exchanges/${exchangeId}`);
}
