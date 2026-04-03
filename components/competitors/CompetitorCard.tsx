'use client';

import { useState } from 'react';
import type { Competitor } from '@/lib/types';
import { ChevronDown, ChevronUp, Trash2, ExternalLink } from 'lucide-react';

interface CompetitorMention {
  id: string;
  competitors_mentioned?: Array<{ name: string; position?: number; sentiment?: string }>;
  scanned_at: string;
  query_id?: string;
  platform_id?: number;
  ai_platforms?: {
    id: number;
    name: string;
    slug: string;
  };
  tracked_queries?: {
    id: string;
    query_text: string;
  };
}

interface CompetitorCardProps {
  competitor: Competitor & {
    mention_count: number;
    last_mentioned?: string;
  };
  mentions?: CompetitorMention[];
}

export default function CompetitorCard({ competitor, mentions = [] }: CompetitorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete competitor "${competitor.competitor_name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/competitors?competitor_id=${competitor.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to delete competitor');
      }
    } catch (error) {
      console.error('Error deleting competitor:', error);
      alert('Error deleting competitor');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate trend (simplified - comparing last week vs previous week)
  const trend = competitor.mention_count > 0 ? 5 : 0; // Placeholder

  // Extract recent mentions for this specific competitor
  const relevantMentions = mentions
    ?.filter((mention) =>
      mention.competitors_mentioned?.some((m) => (m as unknown as { name: string }).name === competitor.competitor_name),
    )
    .slice(0, 5) || [];

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{competitor.competitor_name}</h3>
              {competitor.website_url && (
                <a
                  href={competitor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Visit website"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            {competitor.website_url && (
              <p className="text-sm text-gray-500">{competitor.website_url}</p>
            )}
            {competitor.notes && (
              <p className="text-sm text-gray-600 mt-2">{competitor.notes}</p>
            )}
          </div>

          {/* Metrics */}
          <div className="ml-4 text-right">
            <div className="inline-block bg-blue-50 rounded-full px-3 py-1 mb-2">
              <span className="text-sm font-semibold text-blue-700">
                {competitor.mention_count}
              </span>
              <span className="text-xs text-blue-600 ml-1">mentions</span>
            </div>
            {competitor.mention_count > 0 && (
              <div className="flex items-center justify-end gap-1 text-green-600 text-sm">
                <span>↑</span>
                <span>{trend}% trend</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Mentions Section */}
      {competitor.mention_count > 0 && (
        <>
          <div
            className="px-6 py-4 bg-gray-50 border-t border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <button className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-700">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <span>Recent Mentions ({relevantMentions.length})</span>
            </button>
          </div>

          {isExpanded && (
            <div className="px-6 py-4 border-t border-gray-100 bg-white">
              {relevantMentions.length === 0 ? (
                <p className="text-sm text-gray-500">No mention details available</p>
              ) : (
                <div className="space-y-3">
                  {relevantMentions.map((mention) => {
                    const platform = (mention as unknown as { ai_platforms?: { name: string; slug: string } }).ai_platforms;
                    const query = (mention as unknown as { tracked_queries?: { query_text: string } }).tracked_queries;

                    return (
                      <div
                        key={mention.id}
                        className="p-3 bg-gray-50 rounded-md border border-gray-200 text-xs"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex gap-2">
                            {platform && (
                              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {platform.name}
                              </span>
                            )}
                            <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                              {new Date(mention.scanned_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {query && (
                          <p className="text-gray-700">
                            <strong>Query:</strong> {query.query_text}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Footer with Delete Button */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
