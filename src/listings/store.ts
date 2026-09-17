import { randomUUID } from 'node:crypto';
import type { Listing } from './types.js';

/** In-memory listing store. Repository seam: swap for MySQL (ADR-0002) without touching the service. */
export class ListingsStore {
  private items = new Map<string, Listing>();
  private order: string[] = [];

  insert(listing: Omit<Listing, 'id' | 'createdAt'>): Listing {
    const full: Listing = {
      ...listing,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.items.set(full.id, full);
    this.order.push(full.id);
    return full;
  }

  get(id: string): Listing | undefined {
    return this.items.get(id);
  }

  save(listing: Listing): void {
    this.items.set(listing.id, listing);
  }

  all(): Listing[] {
    return this.order.map((id) => this.items.get(id)!).filter(Boolean);
  }

  countActiveByOwner(ownerId: string): number {
    return this.all().filter((l) => l.ownerId === ownerId && l.status === 'Active').length;
  }
}
