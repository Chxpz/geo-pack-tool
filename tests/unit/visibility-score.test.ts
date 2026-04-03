import { describe, expect, it } from 'vitest';

import { calculateVisibilityScore } from '@/lib/visibility-score';

describe('calculateVisibilityScore', () => {
  it('computes the weighted score components', () => {
    const result = calculateVisibilityScore({
      totalQueries: 10,
      mentionedQueries: 5,
      avgPosition: 1,
      sentimentPositive: 3,
      sentimentNeutral: 1,
      sentimentNegative: 1,
      ownDomainCitations: 4,
      totalCitations: 5,
    });

    expect(result.score).toBe(70);
    expect(result.components.mention_rate.contribution).toBe(20);
    expect(result.components.avg_position.contribution).toBe(20);
    expect(result.components.sentiment.contribution).toBe(14);
    expect(result.components.own_citation_rate.contribution).toBe(16);
  });

  it('returns zero when there is no source data', () => {
    const result = calculateVisibilityScore({
      totalQueries: 0,
      mentionedQueries: 0,
      avgPosition: null,
      sentimentPositive: 0,
      sentimentNeutral: 0,
      sentimentNegative: 0,
      ownDomainCitations: 0,
      totalCitations: 0,
    });

    expect(result.score).toBe(0);
    expect(result.components.avg_position.normalized).toBe(0);
  });

  it('caps a perfect profile at 100', () => {
    const result = calculateVisibilityScore({
      totalQueries: 10,
      mentionedQueries: 10,
      avgPosition: 1,
      sentimentPositive: 10,
      sentimentNeutral: 0,
      sentimentNegative: 0,
      ownDomainCitations: 10,
      totalCitations: 10,
    });

    expect(result.score).toBe(100);
  });
});
