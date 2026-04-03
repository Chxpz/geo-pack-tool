import { z } from 'zod';

// Enums
export const BUSINESS_TYPES = [
  'realtor',
  'restaurant',
  'law_firm',
  'dental',
  'plumber',
  'salon',
  'accountant',
  'saas',
  'ecommerce',
  'agency',
  'medical',
  'fitness',
  'home_services',
  'consulting',
  'other',
] as const;

export const QUERY_TYPES = [
  'search_query',
  'voice_search',
  'featured_snippet',
  'local_search',
] as const;

export const INTENT_CATEGORIES = [
  'informational',
  'navigational',
  'commercial',
  'transactional',
] as const;

// Business schemas
export const businessCreateSchema = z.object({
  business_name: z.string().min(2).max(200),
  business_type: z.enum(BUSINESS_TYPES),
  business_category: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  address_country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website_url: z.string().url().optional(),
  google_business_profile_url: z.string().url().optional(),
  social_profiles: z.record(z.string()).optional(),
  service_areas: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const businessUpdateSchema = businessCreateSchema.partial();

export const competitorCreateSchema = z.object({
  business_id: z.string().uuid(),
  competitor_name: z.string().min(2).max(200),
  website_url: z.string().url().optional(),
  google_business_profile_url: z.string().url().optional(),
  notes: z.string().optional(),
});

export const queryCreateSchema = z.object({
  business_id: z.string().uuid(),
  query_text: z.string().min(5).max(500),
  query_type: z.enum(QUERY_TYPES),
  intent_category: z.enum(INTENT_CATEGORIES).optional(),
  tags: z.array(z.string()).optional(),
});

// Inferred types
export type BusinessCreate = z.infer<typeof businessCreateSchema>;
export type BusinessUpdate = z.infer<typeof businessUpdateSchema>;
export type CompetitorCreate = z.infer<typeof competitorCreateSchema>;
export type QueryCreate = z.infer<typeof queryCreateSchema>;
