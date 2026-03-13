import { useState, useEffect, useRef } from 'react'
import { Send, ChevronDown } from 'lucide-react'

/** Inline "BIBLE AI" wordmark used wherever Brain icon used to be */
const BibleAIBadge = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const styles: Record<string, React.CSSProperties> = {
    sm: { fontSize: 9, padding: '2px 6px', borderRadius: 5, letterSpacing: '0.08em' },
    md: { fontSize: 11, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.08em' },
    lg: { fontSize: 14, padding: '5px 11px', borderRadius: 8, letterSpacing: '0.1em' },
  };
  return (
    <span style={{
      ...styles[size],
      background: 'linear-gradient(135deg, #7A5200, #C8920E, #F5C842)',
      color: '#fff',
      fontWeight: 800,
      fontFamily: 'var(--font-sans)',
      display: 'inline-block',
      lineHeight: 1.2,
    }}>
      BIBLE AI
    </span>
  );
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  'What does this passage mean?',
  'Give me historical context',
  'How does this apply to my life?',
  'What do Greek/Hebrew words reveal here?',
  'Connect this to the rest of Scripture',
  'What is God saying to me through this?',
]

const SELECTION_PROMPTS = (text: string) => [
  `Explain the meaning of: "${text.substring(0, 60)}${text.length > 60 ? '…' : ''}"`,
  `What is the original Greek or Hebrew meaning here?`,
  `How does this passage apply to daily life?`,
  `What is the theological significance of this text?`,
  `Connect this verse to the broader narrative of Scripture`,
]

interface BibleAIProps {
  isOpen: boolean
  onClose: () => void
  onOpen?: () => void
  initialContext?: string
  selectedText?: string
}

export function BibleAI({ isOpen, onClose, onOpen, initialContext, selectedText }: BibleAIProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Pre-populate input when selectedText changes and panel is open
  useEffect(() => {
    if (isOpen && selectedText && selectedText.trim()) {
      setInput(`Tell me more about: "${selectedText.substring(0, 120)}${selectedText.length > 120 ? '…' : ''}"`)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [selectedText, isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [messages, isOpen])

  async function sendMessage(text?: string) {
    const msg = text ?? input.trim()
    if (!msg || loading) return
    setInput('')
    const userMsg: Message = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    const systemParts: string[] = [
      'You are a Bible study assistant for Futures Church Daily Word. You help people understand scripture, explore original languages, find application for daily life, and go deeper in their faith. Be warm, pastoral, and insightful. Keep responses clear and digestible — aim for 2-4 short paragraphs unless a longer answer is truly needed.',
    ]
    if (selectedText) systemParts.push(`The user has highlighted this passage: "${selectedText.substring(0, 600)}"`)
    if (initialContext) systemParts.push(initialContext)
    const systemPrompt = systemParts.join('\n\n')

    try {
      const res = await fetch('/.netlify/functions/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          system: systemPrompt,
          max_tokens: 1024,
        }),
      })
      const data = await res.json()
      const reply = data?.content?.[0]?.text ?? data?.error ?? 'Sorry, something went wrong. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const promptsToShow = selectedText ? SELECTION_PROMPTS(selectedText) : QUICK_PROMPTS

  return (
    <>
      {/* Floating trigger button — burnished gold rectangle */}
      <button
        onClick={onOpen ?? onClose}
        aria-label="Bible AI"
        style={{
          position: 'fixed',
          bottom: 84,
          right: 16,
          height: 26,
          padding: '0 10px',
          borderRadius: 6,
          background: 'linear-gradient(155deg, #4D2E00 0%, #9A6A08 18%, #C8920E 35%, #E8B910 50%, #F5CF55 58%, #D4A017 72%, #9A6A08 88%, #4D2E00 100%)',
          backgroundSize: '200% 200%',
          animation: 'aiAurora 4s ease infinite',
          border: '1px solid rgba(245,207,85,0.55)',
          boxShadow: '0 3px 18px rgba(160,110,8,0.65), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.22)',
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          cursor: 'pointer',
          zIndex: 90,
          overflow: 'hidden',
        }}
        onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
        onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {/* glass highlight */}
        <span style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '46%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)',
          borderRadius: '6px 6px 0 0', pointerEvents: 'none',
        }} />
        {/* shimmer */}
        <span style={{
          position: 'absolute', top: 0, bottom: 0, width: '55%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.26) 50%, transparent 100%)',
          animation: 'aiBeam 3s ease-in-out infinite', pointerEvents: 'none',
        }} />
        <span style={{
          fontSize: 9, fontWeight: 900, color: '#fff',
          fontFamily: 'var(--font-sans)', letterSpacing: '0.14em',
          textTransform: 'uppercase', position: 'relative',
          textShadow: '0 1px 2px rgba(80,40,0,0.6)',
        }}>AI</span>
      </button>

      <style>{`
        @keyframes aiAurora { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes aiBeam { 0% { left: -60%; opacity: 0; } 8% { opacity: 1; } 40% { left: 160%; opacity: 0; } 100% { left: 160%; opacity: 0; } }
      `}</style>

      {/* Panel backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 92,
          }}
        />
      )}

      {/* Slide-up panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '82vh',
          background: 'var(--dw-canvas, #FAFAF8)',
          borderRadius: '20px 20px 0 0',
          zIndex: 93,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px 10px',
          borderBottom: '1px solid var(--dw-border, #E8E6E0)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Gold badge icon */}
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: 'linear-gradient(145deg, #4D2E00, #C8920E, #F5C842)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(140,95,5,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative',
            }}>
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                borderRadius: '9px 9px 0 0',
              }} />
              <BibleAIBadge size="sm" />
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, color: 'var(--dw-text)', display: 'block', lineHeight: 1.2 }}>
                Bible AI
              </span>
              <span style={{
                fontSize: 10, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                letterSpacing: '0.03em', display: 'block', marginTop: 1,
              }}>
                Powered by Claude · Anthropic
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--dw-text-muted)' }}
          >
            <ChevronDown size={22} />
          </button>
        </div>

        {/* Messages or empty state */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 8px 16px' }}>
              <BibleAIBadge size="lg" />
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--dw-text)', marginBottom: 4 }}>
                {selectedText ? 'Go deeper on this passage' : 'Ask me about scripture'}
              </p>
              <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20 }}>
                {selectedText
                  ? 'Context, meaning, language, application'
                  : 'Context, meaning, application, Greek/Hebrew, and more'}
              </p>

              {/* How-to flow strip — only shown when no text is pre-selected */}
              {!selectedText && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0,
                  marginBottom: 22,
                  flexWrap: 'wrap',
                  rowGap: 8,
                }}>
                  {[
                    { step: '1', label: 'Tap any passage\nor devotion' },
                    { step: '2', label: 'Press Ask AI\nin the toolbar' },
                    { step: '3', label: 'Choose a\nquick prompt' },
                    { step: '4', label: 'Get your\nanswer instantly' },
                  ].map(({ step, label }, i, arr) => (
                    <>
                      <div key={step} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 5,
                        minWidth: 64,
                      }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #7A5200, #C8920E)',
                          color: '#fff', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-sans)',
                          boxShadow: '0 2px 8px rgba(140,95,5,0.35)',
                        }}>{step}</div>
                        <span style={{
                          fontSize: 10.5, color: 'var(--dw-text-muted)',
                          fontFamily: 'var(--font-sans)', lineHeight: 1.4,
                          whiteSpace: 'pre-line', textAlign: 'center',
                        }}>{label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <span key={`arrow-${i}`} style={{
                          fontSize: 14, color: 'rgba(154,123,46,0.5)',
                          alignSelf: 'flex-start', marginTop: 8, padding: '0 2px',
                        }}>›</span>
                      )}
                    </>
                  ))}
                </div>
              )}

              <p style={{
                fontSize: 11, color: 'rgba(154,123,46,0.75)', fontFamily: 'var(--font-sans)',
                marginBottom: 18, letterSpacing: '0.03em',
              }}>
                {selectedText ? '— or choose a question below —' : '— or type your own question below —'}
              </p>
              {selectedText && (
                <div style={{
                  background: 'rgba(154,123,46,0.10)',
                  border: '1px solid rgba(154,123,46,0.25)',
                  borderLeft: '3px solid #9A7B2E',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  textAlign: 'left',
                  fontSize: 13,
                  color: 'var(--dw-text)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}>
                  {selectedText.substring(0, 200)}{selectedText.length > 200 ? '…' : ''}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 340, margin: '0 auto' }}>
                {promptsToShow.map(p => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    style={{
                      background: '#F5F3EF',
                      border: '1px solid #E0DDD6',
                      borderRadius: 10,
                      padding: '10px 16px',
                      fontSize: 13,
                      color: '#1A1714',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      textAlign: 'left',
                      lineHeight: 1.4,
                      transition: 'background 0.12s',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 14,
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '82%',
                      padding: '10px 14px',
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: m.role === 'user'
                        ? 'linear-gradient(135deg, #7A5200, #C8920E, #F5C842)'
                        : 'var(--dw-card, #F5F3EF)',
                      color: m.role === 'user' ? '#fff' : 'var(--dw-text)',
                      fontSize: 14,
                      lineHeight: 1.55,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 4, padding: '8px 0', alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--dw-text-muted)',
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input bar */}
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--dw-border, #E8E6E0)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          flexShrink: 0,
          background: 'var(--dw-canvas, #FAFAF8)',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this passage…"
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              border: '1px solid var(--dw-border, #E8E6E0)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              background: 'var(--dw-card, #F5F3EF)',
              color: 'var(--dw-text)',
              outline: 'none',
              maxHeight: 100,
              overflowY: 'auto',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #7A5200, #C8920E, #F5C842)'
                : 'var(--dw-border, #E8E6E0)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            <Send size={17} color={input.trim() && !loading ? '#fff' : 'var(--dw-text-muted)'} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
