export interface VisibilityScoreInput {
  totalQueries: number;
  mentionedQueries: number;
  avgPosition: number | null;
  sentimentPositive: number;
  sentimentNeutral: number;
  sentimentNegative: number;
  ownDomainCitations: number;
  totalCitations: number;
}

export interface ComponentScore {
  value: number;
  normalized?: number;
  weight: number;
  contribution: number;
}

export interface VisibilityScoreResult {
  score: number; // 0-100
  components: {
    mention_rate: ComponentScore;
    avg_position: ComponentScore;
    sentiment: ComponentScore;
    own_citation_rate: ComponentScore;
  };
}

export function calculateVisibilityScore(
  input: VisibilityScoreInput
): VisibilityScoreResult {
  // Component 1: Mention Rate (40% weight)
  const mentionRate = input.totalQueries > 0
    ? input.mentionedQueries / input.totalQueries
    : 0;
  const mentionContribution = mentionRate * 0.4 * 100;

  // Component 2: Average Position (20% weight)
  // Normalize position to 0-1 scale: position 1 = 1.0, position 10+ = 0.0
  let avgPositionNormalized = 0;
  if (input.avgPosition !== null && input.avgPosition !== undefined) {
    // Linear interpolation from position 1 (1.0) to position 10+ (0.0)
    avgPositionNormalized = Math.max(0, Math.min(1, 1 - (input.avgPosition - 1) / 9));
  }
  const avgPositionContribution = avgPositionNormalized * 0.2 * 100;

  // Component 3: Sentiment Score (20% weight)
  const totalMentions = input.sentimentPositive + input.sentimentNeutral + input.sentimentNegative;
  let sentimentScore = 0;
  if (totalMentions > 0) {
    // Normalize sentiment to 0-1 scale: (positive - negative) / total, then normalize to 0-1
    const sentimentRaw = (input.sentimentPositive - input.sentimentNegative) / totalMentions;
    // Convert from -1 to 1 range to 0 to 1 range
    sentimentScore = (sentimentRaw + 1) / 2;
  }
  const sentimentContribution = sentimentScore * 0.2 * 100;

  // Component 4: Own Domain Citation Rate (20% weight)
  const ownDomainCitationRate = input.totalCitations > 0
    ? input.ownDomainCitations / input.totalCitations
    : 0;
  const ownCitationContribution = ownDomainCitationRate * 0.2 * 100;

  // Total score (0-100)
  const totalScore = mentionContribution + avgPositionContribution + sentimentContribution + ownCitationContribution;

  return {
    score: Math.round(totalScore * 10) / 10, // Round to 1 decimal place
    components: {
      mention_rate: {
        value: mentionRate,
        weight: 0.4,
        contribution: Math.round(mentionContribution * 10) / 10,
      },
      avg_position: {
        value: input.avgPosition || 0,
        normalized: avgPositionNormalized,
        weight: 0.2,
        contribution: Math.round(avgPositionContribution * 10) / 10,
      },
      sentiment: {
        value: sentimentScore,
        weight: 0.2,
        contribution: Math.round(sentimentContribution * 10) / 10,
      },
      own_citation_rate: {
        value: ownDomainCitationRate,
        weight: 0.2,
        contribution: Math.round(ownCitationContribution * 10) / 10,
      },
    },
  };
}
