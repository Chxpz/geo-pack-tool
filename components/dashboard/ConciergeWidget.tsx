'use client';

import Link from 'next/link';
import { ChatWidget } from '@/components/agent/ChatWidget';
import { InsightCard } from '@/components/agent/InsightCard';
import { useState, useEffect } from 'react';

interface ConciergeWidgetProps {
  businessId: string;
}

interface Insight {
  id: string;
  type: 'weekly_summary' | 'competitive_alert' | 'recommendation';
  title: string;
  summary: string;
  findings: string[];
  recommendations: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    effort: 'quick_win' | 'medium' | 'strategic';
  }>;
  dataSourceRefs?: string[];
  generatedAt?: string;
}

export function ConciergeWidget({ businessId }: ConciergeWidgetProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    // Optionally load recent insights on mount
    loadRecentInsights();
  }, [businessId]);

  const loadRecentInsights = async () => {
    // In a real implementation, this would fetch from an insights API
    // For now, we'll just show sample insights
    setInsights([
      {
        id: 'insight_1',
        type: 'weekly_summary',
        title: 'Weekly Summary',
        summary: 'Your AI visibility improved 5% this week. New content is ranking well.',
        findings: [
          'ChatGPT mentions up 3 positions',
          'Perplexity coverage increased',
        ],
        recommendations: [
          {
            action: 'Update schema on top pages',
            priority: 'high',
            effort: 'quick_win',
          },
        ],
      },
    ]);
  };

  const generateInsight = async (type: 'weekly_summary' | 'competitive_alert' | 'recommendation') => {
    setLoadingInsights(true);
    try {
      const response = await fetch('/api/agent/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, type }),
      });

      if (response.ok) {
        const insight = await response.json();
        setInsights(prev => [insight, ...prev]);
      }
    } catch (error) {
      console.error('Failed to generate insight:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mini Chat Widget */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Quick Questions
        </h2>
        <ChatWidget businessId={businessId} mode="compact" />
      </div>

      {/* Insights Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Recent Insights
          </h2>
          <Link href="/agent" className="text-sm text-blue-600 hover:underline font-medium">
            View all →
          </Link>
        </div>

        {/* Quick insight buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => generateInsight('weekly_summary')}
            disabled={loadingInsights}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-500 transition"
          >
            📊 Summary
          </button>
          <button
            onClick={() => generateInsight('competitive_alert')}
            disabled={loadingInsights}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:bg-gray-100 disabled:text-gray-500 transition"
          >
            ⚡ Competitive
          </button>
          <button
            onClick={() => generateInsight('recommendation')}
            disabled={loadingInsights}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:bg-gray-100 disabled:text-gray-500 transition"
          >
            💡 Action
          </button>
        </div>

        {/* Insights list */}
        <div className="space-y-3">
          {insights.length === 0 ? (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-600">
                Generate insights to see AI-powered recommendations
              </p>
            </div>
          ) : (
            insights.slice(0, 2).map(insight => (
              <InsightCard key={insight.id} {...insight} compact={true} />
            ))
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <Link
        href="/agent"
        className="block w-full text-center px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition"
      >
        Open Full Concierge →
      </Link>
    </div>
  );
}
