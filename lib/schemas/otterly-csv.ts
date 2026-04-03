import { z } from 'zod';

// Helper function to parse Otterly boolean values
export function parseOtterlyBoolean(val: string): boolean {
  if (typeof val !== 'string') return false;
  const normalized = val.trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1';
}

// Otterly Search Prompts Row schema
export const otterlySearchPromptsRowSchema = z.object({
  search_prompt: z.string(),
  country: z.string(),
  tags: z.string().optional(),
  intent_volume: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  growth_3m: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  total_citations: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  // ChatGPT
  brand_mentioned_chatgpt: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  domain_cited_chatgpt: z.string().optional(),
  competitor_mentioned_chatgpt: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  competitor_cited_chatgpt: z.string().optional(),
  // Perplexity
  brand_mentioned_perplexity: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  domain_cited_perplexity: z.string().optional(),
  competitor_mentioned_perplexity: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  competitor_cited_perplexity: z.string().optional(),
  // Copilot
  brand_mentioned_copilot: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  domain_cited_copilot: z.string().optional(),
  competitor_mentioned_copilot: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  competitor_cited_copilot: z.string().optional(),
  // Google AIO
  brand_mentioned_google_aio: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  domain_cited_google_aio: z.string().optional(),
  competitor_mentioned_google_aio: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  competitor_cited_google_aio: z.string().optional(),
  // AI Mode
  brand_mentioned_ai_mode: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  domain_cited_ai_mode: z.string().optional(),
  competitor_mentioned_ai_mode: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  competitor_cited_ai_mode: z.string().optional(),
  // Gemini
  brand_mentioned_gemini: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  domain_cited_gemini: z.string().optional(),
  competitor_mentioned_gemini: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  competitor_cited_gemini: z.string().optional(),
  // Aggregate metrics
  brand_mentioned_all: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  brand_rank: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
});

// Otterly Citations Full Row schema
export const otterlyCitationsFullRowSchema = z.object({
  prompt: z.string(),
  country: z.string(),
  service: z.string(),
  title: z.string(),
  url: z.string().url(),
  position: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  date: z.string(),
  domain: z.string(),
  domain_category: z.string().optional(),
  my_brand_mentioned: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  competitors_mentioned: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
});

// Otterly Citations Summary Row schema
export const otterlyCitationsSummaryRowSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  domain: z.string(),
  domain_category: z.string().optional(),
  my_brand_mentioned: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
  competitors_mentioned: z
    .string()
    .optional()
    .transform((val) => (val ? parseOtterlyBoolean(val) : undefined)),
});

// Inferred types
export type OtterlySearchPromptsRow = z.infer<typeof otterlySearchPromptsRowSchema>;
export type OtterlyCitationsFullRow = z.infer<typeof otterlyCitationsFullRowSchema>;
export type OtterlyCitationsSummaryRow = z.infer<typeof otterlyCitationsSummaryRowSchema>;
