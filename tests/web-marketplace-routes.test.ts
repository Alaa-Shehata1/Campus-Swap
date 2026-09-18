import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('marketplace route migration', () => {
  it('defines the browse grid and keeps browse full-width', () => {
    assert.ok(existsSync(join(root, 'web/components/ListingGrid.tsx')));
    assert.match(read('web/app/page.tsx'), /BrowseFilters/);
    assert.match(read('web/components/BrowseFilters.tsx'), /FilterRail[\s\S]*open=/);
    assert.match(read('web/components/BrowseFilters.tsx'), /onToggle=/);
    assert.doesNotMatch(read('web/app/page.tsx'), /max-w-4xl|max-w-5xl/);
    assert.match(read('web/components/ListingCard.tsx'), /Badge/);
  });

  it('defines the listing detail commerce rail', () => {
    for (const file of ['OwnerSummary.tsx', 'ListingActionPanel.tsx', 'ReportEntryPoint.tsx']) {
      assert.ok(existsSync(join(root, 'web/components', file)), file);
    }
    assert.match(read('web/app/listings/[id]/page.tsx'), /OwnerSummary/);
    assert.match(read('web/app/listings/[id]/page.tsx'), /ReportEntryPoint/);
  });

  it('defines shared form feedback primitives and uses them in forms', () => {
    assert.ok(existsSync(join(root, 'web/components/ui/FormField.tsx')));
    assert.ok(existsSync(join(root, 'web/components/ui/InlineAlert.tsx')));
    for (const file of ['LoginForm.tsx', 'SignupForm.tsx', 'PublishForm.tsx', 'ProfileForm.tsx']) {
      assert.match(read(`web/components/${file}`), /FormField|InlineAlert/);
    }
  });

  it('migrates legal and route-state surfaces', () => {
    for (const file of ['web/app/loading.tsx', 'web/app/error.tsx', 'web/app/not-found.tsx']) {
      assert.ok(existsSync(join(root, file)), file);
    }
    assert.match(read('web/app/terms/page.tsx'), /Container|PageHeader/);
    assert.match(read('web/app/privacy/page.tsx'), /Container|PageHeader/);
  });
});
