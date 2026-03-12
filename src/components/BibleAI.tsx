/**
 * Bible AI chat — powered by /api/claude.
 * Rate limited: 15 req/min. Max 20 messages in history.
 */
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, X, Sparkles } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  'What does this passage mean?',
  'How can I apply this to my life?',
  'What is the historical context?',
  'Explain a key word in Greek/Hebrew',
  'Cross-reference related verses',
  'Summarize the main theme',
];

interface BibleAIProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: string;
}

export function BibleAI({ isOpen, onClose, initialContext }: BibleAIProps) {
  const { userProfile } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    if (requestCount >= 15) return; // Rate limit

    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg].slice(-20); // Max 20 messages
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setRequestCount(c => c + 1);

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: initialContext || '',
          campus: userProfile?.campus || '',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.response || data.text || 'I apologize, I could not generate a response.',
        };
        setMessages(prev => [...prev, assistantMsg].slice(-20));
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your internet and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'var(--dw-canvas)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--dw-border)',
        paddingTop: 'calc(16px + var(--safe-top))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={20} style={{ color: 'var(--dw-accent)' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--dw-text-primary)' }}>
            Bible AI
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontFamily: 'var(--font-sans)' }}>
            {15 - requestCount} left
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Sparkles size={32} style={{ color: 'var(--dw-accent)', marginBottom: 12 }} />
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--dw-text-primary)', marginBottom: 8 }}>
              Ask me about scripture
            </p>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 24 }}>
              Context, meaning, application, Greek/Hebrew, and more
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  style={{
                    background: 'var(--dw-surface)',
                    border: '1px solid var(--dw-border)',
                    borderRadius: 999,
                    padding: '8px 14px',
                    color: 'var(--dw-text-secondary)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    minHeight: 36,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%',
              background: msg.role === 'user' ? 'var(--dw-accent)' : 'var(--dw-surface)',
              color: msg.role === 'user' ? '#fff' : 'var(--dw-text-primary)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '12px 16px',
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
            <Loader2 size={16} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 20px',
        paddingBottom: 'calc(12px + var(--safe-bottom))',
        borderTop: '1px solid var(--dw-border)',
        display: 'flex', gap: 10,
      }}>
        <input
          type="text"
          placeholder="Ask about scripture..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
          style={{
            flex: 1,
            background: 'var(--dw-surface)',
            border: '1px solid var(--dw-border)',
            borderRadius: 12,
            padding: '12px 16px',
            color: 'var(--dw-text-primary)',
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            minHeight: 44,
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            background: 'var(--dw-accent)',
            border: 'none',
            borderRadius: 12,
            padding: '0 16px',
            color: '#fff',
            cursor: loading || !input.trim() ? 'default' : 'pointer',
            opacity: loading || !input.trim() ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 44, minWidth: 44,
          }}
        >
          <Send size={18} />
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
