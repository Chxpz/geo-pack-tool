'use client';

import { useState } from 'react';

export interface CompetitorData {
  id?: string;
  name: string;
  website_url: string;
}

interface CompetitorFormProps {
  onNext: (competitors: CompetitorData[]) => void;
  onBack: () => void;
  businessId: string;
  maxCompetitors: number;
}

interface SuggestedCompetitor {
  id: string;
  name: string;
  website_url: string;
  reason?: string;
}

export function CompetitorForm({
  onNext,
  onBack,
  businessId,
  maxCompetitors,
}: CompetitorFormProps) {
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [currentName, setCurrentName] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<SuggestedCompetitor[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);

  const canAddMore = competitors.length < maxCompetitors;

  const validateCompetitor = (name: string, url: string): string => {
    if (!name.trim()) {
      return 'Competitor name is required';
    }
    if (!url.trim()) {
      return 'Website URL is required';
    }
    try {
      new URL(url);
    } catch {
      return 'Invalid URL format';
    }
    return '';
  };

  const handleAddCompetitor = () => {
    const error = validateCompetitor(currentName, currentUrl);
    if (error) {
      setErrors({ ...errors, [-1]: error });
      return;
    }

    setCompetitors((prev) => [
      ...prev,
      {
        name: currentName.trim(),
        website_url: currentUrl.trim(),
      },
    ]);
    setCurrentName('');
    setCurrentUrl('');
    setErrors({});
  };

  const handleRemoveCompetitor = (index: number) => {
    setCompetitors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAISuggest = async () => {
    setIsLoadingSuggestions(true);
    setErrors({});

    try {
      const response = await fetch('/api/competitors/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch competitor suggestions');
      }

      const data = await response.json();
      setSuggestedCompetitors(data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      setErrors({ [-2]: 'Failed to load suggestions. Please try again.' });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = (id: string) => {
    setSelectedSuggestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAddSuggestedCompetitors = () => {
    const selected = suggestedCompetitors.filter((c) => selectedSuggestions.has(c.id));

    setCompetitors((prev) => [
      ...prev,
      ...selected.map((c) => ({
        id: c.id,
        name: c.name,
        website_url: c.website_url,
      })),
    ]);

    setShowSuggestions(false);
    setSuggestedCompetitors([]);
    setSelectedSuggestions(new Set());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (competitors.length === 0) {
      setErrors({ [-3]: 'Please add at least one competitor' });
      return;
    }

    onNext(competitors);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Manual Entry Section */}
      <div className="space-y-4 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900">Add Competitors Manually</h3>

        <div className="space-y-3">
          <div>
            <label htmlFor="competitor_name" className="block text-sm font-medium text-gray-900">
              Competitor Name
            </label>
            <input
              type="text"
              id="competitor_name"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Acme Real Estate"
            />
          </div>

          <div>
            <label htmlFor="competitor_url" className="block text-sm font-medium text-gray-900">
              Website URL
            </label>
            <input
              type="url"
              id="competitor_url"
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
          </div>

          {errors[-1] && (
            <p className="text-sm text-red-600">{errors[-1]}</p>
          )}

          <button
            type="button"
            onClick={handleAddCompetitor}
            disabled={!canAddMore}
            className="w-full rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white"
          >
            Add Competitor {!canAddMore && `(Max: ${maxCompetitors})`}
          </button>
        </div>
      </div>

      {/* AI Suggest Section */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleAISuggest}
          disabled={isLoadingSuggestions}
          className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
        >
          {isLoadingSuggestions ? 'Loading suggestions...' : 'Let AI suggest competitors'}
        </button>
        {errors[-2] && (
          <p className="mt-2 text-sm text-red-600">{errors[-2]}</p>
        )}
      </div>

      {/* Suggested Competitors Modal */}
      {showSuggestions && (
        <div className="space-y-4 rounded-lg bg-purple-50 p-4">
          <h3 className="text-sm font-medium text-gray-900">AI Suggested Competitors</h3>

          <div className="space-y-2">
            {suggestedCompetitors.map((competitor) => (
              <label
                key={competitor.id}
                className="flex items-start gap-3 rounded-lg border border-purple-200 bg-white p-3 hover:bg-purple-50"
              >
                <input
                  type="checkbox"
                  checked={selectedSuggestions.has(competitor.id)}
                  onChange={() => handleSelectSuggestion(competitor.id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{competitor.name}</p>
                  <p className="text-xs text-gray-600">{competitor.website_url}</p>
                  {competitor.reason && (
                    <p className="mt-1 text-xs text-purple-600">{competitor.reason}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {selectedSuggestions.size > 0 && (
            <button
              type="button"
              onClick={handleAddSuggestedCompetitors}
              className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Add {selectedSuggestions.size} Selected Competitor
              {selectedSuggestions.size !== 1 ? 's' : ''}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowSuggestions(false);
              setSuggestedCompetitors([]);
              setSelectedSuggestions(new Set());
            }}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      )}

      {/* Added Competitors List */}
      {competitors.length > 0 && (
        <div className="space-y-3 rounded-lg bg-green-50 p-4">
          <h3 className="text-sm font-medium text-gray-900">
            Added Competitors ({competitors.length}/{maxCompetitors})
          </h3>

          <div className="space-y-2">
            {competitors.map((competitor, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-green-200 bg-white p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{competitor.name}</p>
                  <p className="text-xs text-gray-600">{competitor.website_url}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCompetitor(index)}
                  className="text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors[-3] && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errors[-3]}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          ← Back
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Continue →
        </button>
      </div>
    </form>
  );
}
