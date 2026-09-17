import { fail, ok, type FieldError, type Result } from '../common/errors.js';
import { isCategory } from '../policy/taxonomy.js';
import { isProhibited } from '../policy/prohibited.js';
import { ListingsStore } from './store.js';
import type {
  Listing,
  ListingTransition,
  PublishInput,
} from './types.js';

export const MAX_TITLE_LENGTH = 80;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_ACTIVE_LISTINGS = 20;
export const MAX_SKILL_IMAGES = 2;
export const MAX_ITEM_IMAGES = 5;

export function createListingsService(store = new ListingsStore()) {
  function publish(ownerId: string, input: PublishInput): Result<Listing> {
    const errors: FieldError[] = [];

    if (!['offer', 'request'].includes(input.side)) {
      errors.push({ code: 'invalid', field: 'side', message: 'Side must be offer or request.' });
    }
    if (!['skill', 'item'].includes(input.kind)) {
      errors.push({ code: 'invalid', field: 'kind', message: 'Kind must be skill or item.' });
    }
    const title = input.title?.trim() ?? '';
    if (!title) {
      errors.push({ code: 'required', field: 'title', message: 'Title is required.' });
    } else if (title.length > MAX_TITLE_LENGTH) {
      errors.push({
        code: 'too-long',
        field: 'title',
        message: `Title must be at most ${MAX_TITLE_LENGTH} characters.`,
      });
    }
    const description = input.description?.trim() ?? '';
    if (!description) {
      errors.push({ code: 'required', field: 'description', message: 'Description is required.' });
    } else if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push({
        code: 'too-long',
        field: 'description',
        message: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
      });
    }
    if (!isCategory(input.category ?? '')) {
      errors.push({
        code: 'invalid',
        field: 'category',
        message: 'Choose a category from the fixed taxonomy.',
      });
    }
    if (!input.zone?.trim()) {
      errors.push({ code: 'required', field: 'zone', message: 'Campus zone / meetup area is required.' });
    }
    const maxImages = input.kind === 'item' ? MAX_ITEM_IMAGES : MAX_SKILL_IMAGES;
    if (!Array.isArray(input.images) || input.images.length > maxImages) {
      errors.push({
        code: 'too-many',
        field: 'images',
        message:
          input.kind === 'item'
            ? `Items allow at most ${MAX_ITEM_IMAGES} images.`
            : `Skills allow at most ${MAX_SKILL_IMAGES} images.`,
      });
    }

    if (input.kind === 'item') {
      if (!['lend', 'give', 'swap'].includes(input.modality ?? '')) {
        errors.push({
          code: 'required',
          field: 'modality',
          message: 'Item modality is required: lend, give, or swap.',
        });
      } else if (input.modality === 'lend' && !input.returnTerm?.trim()) {
        errors.push({
          code: 'required',
          field: 'returnTerm',
          message: 'Lend requires a lender-defined return date/duration.',
        });
      } else if (input.modality === 'swap' && !input.counterpartDescription?.trim()) {
        errors.push({
          code: 'required',
          field: 'counterpartDescription',
          message: 'Swap requires a description of the desired counterpart.',
        });
      }
    }

    if (errors.length > 0) return fail(errors);

    const screened = isProhibited(title, description);
    if (screened.blocked) {
      return fail([
        {
          code: 'prohibited',
          message: `This listing cannot be published (class: ${screened.reason}). See community rules.`,
        },
      ]);
    }

    if ((input.status ?? 'Active') === 'Active' && store.countActiveByOwner(ownerId) >= MAX_ACTIVE_LISTINGS) {
      return fail([
        {
          code: 'listing-cap-reached',
          message: `You already have ${MAX_ACTIVE_LISTINGS} active listings. Pause or archive one to publish another.`,
        },
      ]);
    }

    const listing = store.insert({
      ownerId,
      side: input.side,
      kind: input.kind,
      title,
      description,
      category: input.category as Listing['category'],
      zone: input.zone.trim(),
      images: input.images,
      status: input.status ?? 'Active',
      modality: input.kind === 'item' ? input.modality : undefined,
      returnTerm:
        input.kind === 'item' && input.modality === 'lend' ? input.returnTerm!.trim() : undefined,
      counterpartDescription:
        input.kind === 'item' && input.modality === 'swap'
          ? input.counterpartDescription!.trim()
          : undefined,
    });
    return ok(listing);
  }

  function update(ownerId: string, id: string, patch: Partial<PublishInput>): Result<Listing> {
    const listing = store.get(id);
    if (!listing) return fail([{ code: 'not-found', message: 'Listing not found.' }]);
    if (listing.ownerId !== ownerId) {
      return fail([{ code: 'not-permitted', message: 'Only the owner can edit this listing.' }]);
    }
    if (patch.title !== undefined) {
      const t = patch.title.trim();
      if (!t) return fail([{ code: 'required', field: 'title', message: 'Title cannot be empty.' }]);
      if (t.length > MAX_TITLE_LENGTH) {
        return fail([
          { code: 'too-long', field: 'title', message: `Title must be at most ${MAX_TITLE_LENGTH} characters.` },
        ]);
      }
      listing.title = t;
    }
    if (patch.description !== undefined) {
      const d = patch.description.trim();
      if (!d) {
        return fail([{ code: 'required', field: 'description', message: 'Description cannot be empty.' }]);
      }
      if (d.length > MAX_DESCRIPTION_LENGTH) {
        return fail([
          {
            code: 'too-long',
            field: 'description',
            message: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
          },
        ]);
      }
      listing.description = d;
    }
    const screened = isProhibited(listing.title, listing.description);
    if (screened.blocked) {
      return fail([
        { code: 'prohibited', message: `This listing cannot be kept (class: ${screened.reason}).` },
      ]);
    }
    store.save(listing);
    return ok(listing);
  }

  function transition(ownerId: string, id: string, to: ListingTransition): Result<Listing> {
    const listing = store.get(id);
    if (!listing) return fail([{ code: 'not-found', message: 'Listing not found.' }]);
    if (listing.ownerId !== ownerId) {
      return fail([{ code: 'not-permitted', message: 'Only the owner can change this listing.' }]);
    }
    if (to === 'pause') {
      if (listing.status !== 'Active') {
        return fail([
          { code: 'invalid-transition', field: 'status', message: 'Only Active listings can be paused.' },
        ]);
      }
      listing.status = 'Paused';
    } else if (to === 'archive') {
      listing.status = 'Archived';
    } else {
      if (listing.status !== 'Paused') {
        return fail([
          { code: 'invalid-transition', field: 'status', message: 'Only Paused listings can be reopened.' },
        ]);
      }
      if (store.countActiveByOwner(ownerId) >= MAX_ACTIVE_LISTINGS) {
        return fail([
          {
            code: 'listing-cap-reached',
            message: `You already have ${MAX_ACTIVE_LISTINGS} active listings.`,
          },
        ]);
      }
      listing.status = 'Active';
    }
    store.save(listing);
    return ok(listing);
  }

  function get(id: string): Listing | undefined {
    return store.get(id);
  }

  return { publish, update, transition, get, store };
}

export type ListingsService = ReturnType<typeof createListingsService>;
