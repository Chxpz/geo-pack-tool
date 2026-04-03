export interface QueryGenerationInput {
  businessName: string;
  businessType: string;
  city?: string;
  state?: string;
  serviceAreas: string[];
  description?: string;
  category?: string;
}

export interface GeneratedQuery {
  query_text: string;
  intent_category: string;
}

const BUSINESS_TYPE_TEMPLATES: Record<string, string[]> = {
  realtor: [
    'best realtor in [city]',
    'who should I hire to sell my home in [city]',
    'top real estate agent in [city]',
    'real estate help [city]',
    'selling my house [city]',
    'best real estate company [city]',
    'real estate agent [neighborhood]',
  ],
  restaurant: [
    'best [cuisine] restaurant in [city]',
    'top rated [cuisine] near [city]',
    'where to eat [cuisine] [city]',
    'best restaurant in [city]',
    'popular [cuisine] spot in [city]',
  ],
  plumber: [
    'best plumber in [city]',
    'emergency plumber [city]',
    'plumbing service near [city]',
    'who to call for plumbing [city]',
  ],
  electrician: [
    'best electrician in [city]',
    'electrical services [city]',
    'electrician near [city]',
    'who to hire for electrical work [city]',
  ],
  lawyer: [
    'best [type] lawyer in [city]',
    'legal services [city]',
    '[type] attorney [city]',
    'who should I hire as a lawyer [city]',
  ],
  doctor: [
    'best doctor in [city]',
    'primary care physician [city]',
    'pediatrician near [city]',
    '[specialty] doctor [city]',
  ],
  dentist: [
    'best dentist in [city]',
    'dental services near [city]',
    'pediatric dentist [city]',
    'emergency dentist [city]',
  ],
  salon: [
    'best hair salon in [city]',
    'beauty salon near [city]',
    'nail salon [city]',
    'barber near [city]',
  ],
};

function buildPrompt(input: QueryGenerationInput, count: number): string {
  const location = input.city ? `${input.city}${input.state ? ', ' + input.state : ''}` : input.serviceAreas.join(', ');
  const businessTypeNormalized = input.businessType.toLowerCase();
  const templates = BUSINESS_TYPE_TEMPLATES[businessTypeNormalized] || [];

  let prompt = `Generate ${count} discovery-intent search queries for a business called "${input.businessName}".

Business Details:
- Type: ${input.businessType}
- Location: ${location}
- Service Areas: ${input.serviceAreas.join(', ')}`;

  if (input.description) {
    prompt += `\n- Description: ${input.description}`;
  }
  if (input.category) {
    prompt += `\n- Category: ${input.category}`;
  }

  if (templates.length > 0) {
    prompt += `\n\nBusiness-type-specific query templates to consider:`;
    templates.forEach((template) => {
      prompt += `\n- ${template}`;
    });
  }

  prompt += `\n\nThe queries should be realistic searches that potential customers would perform to find this type of business. Each query should target local discovery intent.

For each query, provide:
1. The exact search query text
2. An intent category (e.g., "local_discovery", "product_search", "service_inquiry", "comparison_shopping")

Format your response as a JSON array with objects containing "query_text" and "intent_category" fields. Return ONLY the valid JSON array, no additional text.`;

  return prompt;
}

function buildTemplateFallback(
  input: QueryGenerationInput,
  count: number
): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];
  const location = input.city || input.serviceAreas[0] || 'near me';
  const businessTypeNormalized = input.businessType.toLowerCase();
  const templates = BUSINESS_TYPE_TEMPLATES[businessTypeNormalized] || [];

  // Use existing templates if available
  const availableTemplates = templates.map((template) => {
    let query = template
      .replace('[city]', input.city || location)
      .replace('[neighborhood]', input.serviceAreas[0] || location)
      .replace('[cuisine]', input.category || 'Italian')
      .replace('[type]', input.category || 'general')
      .replace('[specialty]', input.category || 'general');
    return query;
  });

  // Generic fallback templates
  const genericTemplates = [
    `best ${input.businessType} in ${location}`,
    `top rated ${input.businessType} ${location}`,
    `recommended ${input.businessType} near ${location}`,
    `${input.businessType} services ${location}`,
    `where to find ${input.businessType} ${location}`,
    `${input.businessName}`,
    `${input.businessName} ${location}`,
    `${input.businessType} ${input.serviceAreas.join(' ')}`,
    `how to find ${input.businessType} ${location}`,
    `best ${input.businessType} near me`,
  ];

  const allQueries = [...availableTemplates, ...genericTemplates];

  // Return up to count unique queries
  const seen = new Set<string>();
  for (const query of allQueries) {
    if (seen.size >= count) break;
    if (!seen.has(query)) {
      seen.add(query);
      queries.push({
        query_text: query,
        intent_category: 'local_discovery',
      });
    }
  }

  return queries;
}

export async function generateQueries(
  input: QueryGenerationInput,
  count: number = 10
): Promise<GeneratedQuery[]> {
  const prompt = buildPrompt(input, count);

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set, falling back to template-based generation');
      return buildTemplateFallback(input, count);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `OpenAI API error: ${response.status} ${response.statusText}`,
        errorText
      );
      return buildTemplateFallback(input, count);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected OpenAI response format', data);
      return buildTemplateFallback(input, count);
    }

    const content = data.choices[0].message.content.trim();

    // Parse the JSON response
    const queries: GeneratedQuery[] = JSON.parse(content);

    // Validate the response structure
    if (
      !Array.isArray(queries) ||
      !queries.every(
        (q) =>
          typeof q.query_text === 'string' &&
          typeof q.intent_category === 'string'
      )
    ) {
      console.error('Invalid query format in response', queries);
      return buildTemplateFallback(input, count);
    }

    // Return up to count queries
    return queries.slice(0, count);
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return buildTemplateFallback(input, count);
  }
}
