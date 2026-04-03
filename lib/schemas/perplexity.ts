import { z } from 'zod';

// Sonar Citation schema
export const sonarCitationSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  snippet: z.string().optional(),
  domain: z.string().optional(),
  publish_date: z.string().optional(),
});

// Sonar Search Result schema
export const sonarSearchResultSchema = z.object({
  rank: z.number(),
  url: z.string(),
  title: z.string().optional(),
  snippet: z.string().optional(),
  domain: z.string().optional(),
  timestamp: z.string().optional(),
});

// Sonar Response schema
export const sonarResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  created: z.number(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.string(),
        content: z.string(),
      }),
      finish_reason: z.string(),
    })
  ),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
  citations: z.array(sonarCitationSchema).optional(),
  search_results: z.array(sonarSearchResultSchema).optional(),
  related_questions: z.array(z.string()).optional(),
});

// Structured Scan Output schema
export const structuredScanOutputSchema = z.object({
  business_mentioned: z.boolean(),
  position: z.number().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  competitors: z.array(
    z.object({
      name: z.string(),
      position: z.number().optional(),
      sentiment: z.enum(['positive', 'neutral', 'negative']),
    })
  ),
});

// Inferred types
export type SonarCitation = z.infer<typeof sonarCitationSchema>;
export type SonarSearchResult = z.infer<typeof sonarSearchResultSchema>;
export type SonarResponse = z.infer<typeof sonarResponseSchema>;
export type StructuredScanOutput = z.infer<typeof structuredScanOutputSchema>;
