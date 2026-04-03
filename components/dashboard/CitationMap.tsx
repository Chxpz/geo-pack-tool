'use client';

import { useState } from 'react';

export interface CitationMapEntry {
  domain: string;
  platforms: string[];
  count: number;
  type: 'own' | 'competitor' | 'third_party';
}

interface CitationMapProps {
  citations: CitationMapEntry[];
}

const TYPE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  own: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    badge: 'Your Domain',
  },
  competitor: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    badge: 'Competitor',
  },
  third_party: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    badge: 'Third Party',
  },
};

export default function CitationMap({ citations }: CitationMapProps) {
  const [sortBy, setSortBy] = useState<'count' | 'domain'>('count');

  const sorted = [...(citations || [])].sort((a, b) => {
    if (sortBy === 'count') {
      return b.count - a.count;
    }
    return a.domain.localeCompare(b.domain);
  });

  const downloadCSV = () => {
    const headers = ['Domain', 'Type', 'Citation Count', 'Platforms'];
    const rows = sorted.map((c) => [
      c.domain,
      TYPE_COLORS[c.type].badge,
      c.count.toString(),
      c.platforms.join(', '),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (!citations || citations.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Citation Map</h2>
        </div>
        <div className="text-center py-8 text-gray-500 text-sm">
          No citations found. Run a scan to see citation data.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Citation Map</h2>
        <button
          onClick={downloadCSV}
          className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          ↓ Export CSV
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setSortBy('count')}
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
            sortBy === 'count'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          By Frequency
        </button>
        <button
          onClick={() => setSortBy('domain')}
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
            sortBy === 'domain'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          By Domain
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Domain</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Citations</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Platforms</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const color = TYPE_COLORS[entry.type];
              return (
                <tr key={entry.domain} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900 font-medium">{entry.domain}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${color.bg} ${color.text}`}>
                      {color.badge}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600 font-medium">{entry.count}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">
                    {entry.platforms.join(', ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
