import { describe, expect, it } from 'vitest';

import { matchCompetitorMentions } from '@/lib/scanner';

describe('matchCompetitorMentions', () => {
  const competitors = [
    { id: '1', competitor_name: 'Acme Dental' },
    { id: '2', competitor_name: 'Northside Dental Studio' },
    { id: '3', competitor_name: 'Bright Smiles Clinic' },
  ];

  it('matches exact competitor names', () => {
    const result = matchCompetitorMentions(
      [{ name: 'Acme Dental' }],
      competitors,
    );

    expect(result[0]?.competitor_id).toBe('1');
  });

  it('matches partial competitor names', () => {
    const result = matchCompetitorMentions(
      [{ name: 'Northside Dental' }],
      competitors,
    );

    expect(result[0]?.competitor_id).toBe('2');
  });

  it('matches close spellings via Levenshtein distance', () => {
    const result = matchCompetitorMentions(
      [{ name: 'Bright Smile Clinic' }],
      competitors,
    );

    expect(result[0]?.competitor_id).toBe('3');
  });
});
