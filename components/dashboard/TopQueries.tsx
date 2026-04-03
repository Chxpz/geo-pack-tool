'use client';

import { useState } from 'react';
import type { TopQuery } from '@/lib/types';

interface TopQueriesProps {
  queries: TopQuery[];
}

const PLATFORM_ICONS: Record<string, string> = {
  chatgpt: '🤖',
  perplexity: '🔍',
  gemini: '✨',
  claude: '🧠',
  google_aio: '🌐',
  google_ai_mode: '📱',
  copilot: '💻',
};

const SENTIMENT_COLORS: Record<string, { bg: string; text: string }> = {
  positive: { bg: 'bg-green-100', text: 'text-green-700' },
  neutral: { bg: 'bg-gray-100', text: 'text-gray-700' },
  negative: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function TopQueries({ queries }: TopQueriesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!queries || queries.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Top Queries</h2>
        <div className="text-center py-8 text-gray-500 text-sm">
          No query data available yet. Run a scan to see top queries.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Top Queries</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Query</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Platforms</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Position</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Sentiment</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Last Scanned</th>
            </tr>
          </thead>
          <tbody>
            {queries.map((query) => (
              <tr key={query.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedId(expandedId === query.id ? null : query.id)}>
                <td className="py-3 px-4 text-gray-900 font-medium">{query.query_text}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    {query.platforms_mentioned?.map((platform) => (
                      <span key={platform} title={platform} className="text-lg">
                        {PLATFORM_ICONS[platform] || '•'}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {query.position ? `#${query.position}` : '—'}
                </td>
                <td className="py-3 px-4">
                  {query.sentiment && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      SENTIMENT_COLORS[query.sentiment].bg
                    } ${SENTIMENT_COLORS[query.sentiment].text}`}>
                      {query.sentiment.charAt(0).toUpperCase() + query.sentiment.slice(1)}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {query.last_scanned ? new Date(query.last_scanned).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
