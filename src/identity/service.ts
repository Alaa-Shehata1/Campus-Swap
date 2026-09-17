import { randomUUID } from 'node:crypto';
import { fail, ok, type FieldError, type Result } from '../common/errors.js';
import { IdentityStore, type StoredUser } from './store.js';
import type { ProfilePatch, RegisterInput, Session, UserPublic } from './types.js';

export const DEFAULT_CAMPUS = 'KFS University';
export const MAX_BIO_LENGTH = 500;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toPublic(user: StoredUser): UserPublic {
  const { email: _email, passwordHash: _h, passwordSalt: _s, ...rest } = user;
  void _email;
  void _h;
  void _s;
  return rest;
}

export function createIdentityService(store = new IdentityStore()) {
  const sessions = new Map<string, string>();

  function register(input: RegisterInput): Result<UserPublic> {
    const errors: FieldError[] = [];
    const email = input.email?.trim() ?? '';

    if (!email || !EMAIL_RE.test(email)) {
      errors.push({
        code: 'invalid',
        field: 'email',
        message: 'Provide a valid email address (any domain is accepted).',
      });
    }
    if (!input.password || input.password.length < 8) {
      errors.push({
        code: 'too-short',
        field: 'password',
        message: 'Password must be at least 8 characters.',
      });
    }
    if (!input.displayName?.trim()) {
      errors.push({ code: 'required', field: 'displayName', message: 'Display name is required.' });
    }
    const campus = (input.campus ?? DEFAULT_CAMPUS).trim();
    if (!campus) {
      errors.push({
        code: 'required',
        field: 'campus',
        message: 'Campus is required (default: KFS University). It is self-declared, not verified.',
      });
    }
    if (input.ageConfirmed18 !== true) {
      errors.push({
        code: 'required',
        field: 'ageConfirmed18',
        message: 'You must confirm you are 18 or older.',
      });
    }
    if (input.rulesAccepted !== true) {
      errors.push({
        code: 'required',
        field: 'rulesAccepted',
        message: 'You must accept the community rules.',
      });
    }
    if (errors.length > 0) return fail(errors);

    if (store.findByEmail(email)) {
      return fail([
        { code: 'taken', field: 'email', message: 'An account with this email already exists.' },
      ]);
    }

    const user = store.create({
      email,
      password: input.password,
      displayName: input.displayName.trim(),
      campus,
    });
    return ok(toPublic(user));
  }

  function authenticate(email: string, password: string): Result<Session> {
    const user = store.findByEmail(email.trim());
    if (!user || !store.verifyPassword(user, password)) {
      return fail([{ code: 'invalid-credentials', message: 'Email or password is incorrect.' }]);
    }
    const token = randomUUID();
    sessions.set(token, user.id);
    return ok({ token, userId: user.id });
  }

  function getProfile(id: string): UserPublic | undefined {
    const user = store.findById(id);
    return user ? toPublic(user) : undefined;
  }

  function updateProfile(id: string, patch: ProfilePatch): Result<UserPublic> {
    const user = store.findById(id);
    if (!user) return fail([{ code: 'not-found', message: 'Profile not found.' }]);
    if (patch.displayName !== undefined) {
      if (!patch.displayName.trim()) {
        return fail([
          { code: 'required', field: 'displayName', message: 'Display name cannot be empty.' },
        ]);
      }
      user.displayName = patch.displayName.trim();
    }
    if (patch.bio !== undefined) {
      if (patch.bio.length > MAX_BIO_LENGTH) {
        return fail([
          {
            code: 'too-long',
            field: 'bio',
            message: `Bio must be at most ${MAX_BIO_LENGTH} characters.`,
          },
        ]);
      }
      user.bio = patch.bio;
    }
    if (patch.skillTags !== undefined) user.skillTags = patch.skillTags;
    if (patch.availabilityNotes !== undefined) user.availabilityNotes = patch.availabilityNotes;
    store.save(user);
    return ok(toPublic(user));
  }

  return { register, authenticate, getProfile, updateProfile };
}

export type IdentityService = ReturnType<typeof createIdentityService>;
