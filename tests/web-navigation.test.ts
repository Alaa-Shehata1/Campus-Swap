import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('marketplace navigation and filters (R-T2)', () => {
  it('provides desktop and mobile navigation primitives', () => {
    for (const file of [
      'web/components/navigation/DesktopNav.tsx',
      'web/components/navigation/MobileNav.tsx',
      'web/components/navigation/FilterRail.tsx',
      'web/components/navigation/FilterDrawer.tsx',
    ]) {
      assert.ok(existsSync(join(root, file)), `${file} exists`);
    }
    assert.match(read('web/components/navigation/FilterDrawer.tsx'), /aria-modal="true"/);
    assert.match(read('web/components/navigation/FilterDrawer.tsx'), /Escape|keydown/i);
    assert.match(read('web/components/navigation/FilterRail.tsx'), /aria-expanded/);
  });

  it('keeps all discovery filters in the search form', () => {
    const form = read('web/components/SearchForm.tsx');
    for (const field of ['text', 'side', 'kind', 'category', 'zone', 'availability']) {
      assert.match(form, new RegExp(`name="${field}"`), `${field} filter`);
      assert.match(form, new RegExp(`['"]${field}['"]`), `${field} query key`);
    }
  });

  it('uses semantic tokens and does not reintroduce narrow wrappers', () => {
    const files = [
      'web/components/navigation/DesktopNav.tsx',
      'web/components/navigation/MobileNav.tsx',
      'web/components/navigation/FilterRail.tsx',
      'web/components/navigation/FilterDrawer.tsx',
      'web/components/SearchForm.tsx',
    ];
    for (const file of files) {
      const source = read(file);
      assert.ok(!source.includes('max-w-4xl') && !source.includes('max-w-5xl'), `${file} width`);
      assert.ok(!source.includes('bg-white') && !source.includes('border-stone'), `${file} tokens`);
    }
  });
});
