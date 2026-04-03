'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ url: string; title?: string }>;
}

interface Conversation {
  id: string;
  title: string;
}

interface ChatWidgetProps {
  businessId: string;
  conversationId?: string;
  mode?: 'compact' | 'full';
  onConversationChange?: (id: string) => void;
}

export function ChatWidget({
  businessId,
  conversationId,
  mode = 'full',
  onConversationChange,
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const loadConversations = useEffectEvent(async () => {
    try {
      const res = await fetch(
        `/api/agent/conversations?business_id=${businessId}&per_page=5`
      );
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    void loadConversations();
  }, [businessId, loadConversations]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || streaming) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreaming(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          conversation_id: activeConversation,
          message: input,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setMessages(prev => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Error: ${error.error}`,
          },
        ]);
        setStreaming(false);
        setLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setStreaming(false);
        setLoading(false);
        return;
      }

      let assistantContent = '';
      const assistantId = `msg_${Date.now()}`;
      const decoder = new TextDecoder();

      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
      };
      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.delta) {
                assistantContent += parsed.delta;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: assistantContent }
                      : m
                  )
                );
              }

              if (parsed.citations) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? { ...m, citations: parsed.citations }
                      : m
                  )
                );
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      setStreaming(false);
      void loadConversations();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `Error: ${errorMsg}`,
        },
      ]);
      setStreaming(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = (convId: string) => {
    setActiveConversation(convId);
    setMessages([]);
    onConversationChange?.(convId);
  };

  const isCompact = mode === 'compact';

  return (
    <div
      className={`flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden ${
        isCompact ? 'h-96' : 'h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-4 py-3">
        <h3 className="font-semibold text-gray-900 text-sm">
          AI Concierge Assistant
        </h3>
        <p className="text-xs text-gray-600 mt-0.5">
          Expert GEO/AEO guidance for your business
        </p>
      </div>

      {/* Conversation selector (full mode only) */}
      {!isCompact && conversations.length > 0 && (
        <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
          <div className="flex gap-2 overflow-x-auto">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => handleConversationSelect(conv.id)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition ${
                  activeConversation === conv.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {conv.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div
        ref={messageListRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                {isCompact
                  ? 'Ask your AI concierge anything about your business visibility'
                  : 'Start a conversation with your AI concierge'}
              </p>
              <p className="text-gray-400 text-xs">
                Ask about competitive analysis, GEO strategy, content recommendations...
              </p>
            </div>
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs px-4 py-2.5 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-gray-200 text-gray-900'
                    : 'bg-blue-50 text-gray-900 border border-blue-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Citation links */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-300 space-y-1">
                    {message.citations.slice(0, 3).map((citation, i) => (
                      <a
                        key={i}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline block truncate"
                        title={citation.title || citation.url}
                      >
                        {citation.title || 'Source'}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {streaming && (
          <div className="flex justify-start">
            <div className="bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSend}
        className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about your business..."
          disabled={loading}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>

      {/* Footer link (compact mode) */}
      {isCompact && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-center">
          <Link href="/agent" className="text-xs text-blue-600 hover:underline font-medium">
            Open full concierge →
          </Link>
        </div>
      )}
    </div>
  );
}
