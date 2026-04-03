'use client';

import { useState } from 'react';
import { Zap, Loader } from 'lucide-react';

interface CompetitorFormProps {
  businessId: string;
}

interface SuggestionResponse {
  name: string;
  reason: string;
}

export default function CompetitorForm({ businessId }: CompetitorFormProps) {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionResponse[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Competitor name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          competitor_name: name,
          website_url: website || undefined,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || 'Failed to add competitor');
      }

      setSuccess('Competitor added successfully');
      setName('');
      setWebsite('');
      setNotes('');

      // Reload page to show new competitor
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add competitor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggest = async () => {
    setError('');
    setSuggestions([]);
    setIsLoadingSuggestions(true);

    try {
      const response = await fetch('/api/competitors/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json() as { suggestions?: SuggestionResponse[] };
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: SuggestionResponse) => {
    setName(suggestion.name);
    setSuggestions([]);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Competitor</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Competitor Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Competitor Inc"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* Website Input */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website URL
          </label>
          <input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* Notes Input */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Competitor'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 bg-white text-gray-500">Or</span>
        </div>
      </div>

      {/* AI Suggest Button */}
      <button
        onClick={handleSuggest}
        disabled={isLoadingSuggestions}
        className="w-full bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 disabled:opacity-50 border border-purple-200 text-purple-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoadingSuggestions ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            AI Suggest Competitors
          </>
        )}
      </button>

      {/* Suggestions List */}
      {suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-gray-600 uppercase">Suggestions</p>
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors"
            >
              <p className="font-medium text-gray-900">{suggestion.name}</p>
              <p className="text-xs text-gray-600 mt-1">{suggestion.reason}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
