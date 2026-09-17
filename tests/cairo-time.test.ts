import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatCairoTime } from '../src/common/cairoTime.js';

describe('cairoTime', () => {
  it('labels datetimes explicitly as Cairo time', () => {
    // 2026-03-12T13:30:00Z == 15:30 in Africa/Cairo (UTC+2, no DST in March)
    assert.equal(formatCairoTime('2026-03-12T13:30:00.000Z'), '12 Mar 2026, 15:30 Cairo time');
  });

  it('rejects invalid input', () => {
    assert.throws(() => formatCairoTime('not-a-date'), RangeError);
  });
});
