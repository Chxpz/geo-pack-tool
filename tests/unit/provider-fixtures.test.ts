import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import anthropicFixture from '@/tests/fixtures/providers/anthropic-messages.json';
import geminiFixture from '@/tests/fixtures/providers/gemini-generate-content.json';
import openAiFixture from '@/tests/fixtures/providers/openai-chat-completions.json';
import perplexityFixture from '@/tests/fixtures/providers/perplexity-chat-completions.json';
import subscriptionCreatedFixture from '@/tests/fixtures/providers/stripe/customer.subscription.created.json';
import invoicePaidFixture from '@/tests/fixtures/providers/stripe/invoice.paid.json';

describe('provider fixtures', () => {
  it('match expected JSON payload shapes', () => {
    expect(openAiFixture.choices[0]?.message?.content).toContain('business_mentioned');
    expect(anthropicFixture.content[0]?.type).toBe('text');
    expect(geminiFixture.candidates[0]?.content?.parts[0]?.text).toContain('competitors');
    expect(perplexityFixture.citations.length).toBeGreaterThan(0);
    expect(subscriptionCreatedFixture.type).toBe('customer.subscription.created');
    expect(invoicePaidFixture.type).toBe('invoice.paid');
  });

  it('includes a SEMrush CSV fixture with semicolon-delimited columns', () => {
    const csv = readFileSync(
      new URL('../fixtures/providers/semrush-domain-organic.csv', import.meta.url),
      'utf8',
    );

    const lines = csv.trim().split('\n');

    expect(lines[0]).toContain('Ph;Po;Pp;Nq');
    expect(lines).toHaveLength(3);
  });
});
