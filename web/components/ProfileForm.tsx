'use client';

import { useActionState } from 'react';
import { updateProfileAction, type ActionState } from '../app/actions';
import { FieldErrors } from './FieldErrors';
import { SubmitButton } from './SubmitButton';
import type { UserPublic } from '../../src/identity/types.js';
import { InlineAlert } from './ui/InlineAlert';

const initial: ActionState = { errors: [] };
const input = 'w-full rounded-md border border-border bg-surface-elevated px-3 py-2';

export function ProfileForm({ user }: { user: UserPublic }) {
  const [state, action] = useActionState(updateProfileAction, initial);
  return (
    <form action={action} className="space-y-4">
      <InlineAlert tone="info" title="Profile privacy">
        Your university email is never displayed publicly.
      </InlineAlert>
      <h2 className="text-lg font-bold">Edit profile</h2>
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium">
          Display name
        </label>
        <input id="displayName" name="displayName" defaultValue={user.displayName} required className={input} />
        <FieldErrors errors={state.errors} field="displayName" />
      </div>
      <div>
        <label htmlFor="bio" className="block text-sm font-medium">
          Bio (max 500)
        </label>
        <textarea id="bio" name="bio" defaultValue={user.bio ?? ''} maxLength={500} rows={3} className={input} />
        <FieldErrors errors={state.errors} field="bio" />
      </div>
      <div>
        <label htmlFor="skillTags" className="block text-sm font-medium">
          Skill tags           <span className="font-normal text-text-muted">(comma separated)</span>
        </label>
        <input
          id="skillTags"
          name="skillTags"
          defaultValue={(user.skillTags ?? []).join(', ')}
          className={input}
        />
      </div>
      <div>
        <label htmlFor="availabilityNotes" className="block text-sm font-medium">
          Availability notes
        </label>
        <input
          id="availabilityNotes"
          name="availabilityNotes"
          defaultValue={user.availabilityNotes ?? ''}
          className={input}
        />
      </div>
      <FieldErrors errors={state.errors} />
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
