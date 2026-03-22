import { useState, useEffect, useRef } from 'react'
import { trackBehavior } from '../utils/behavior'
import { getPersonaConfig } from '../utils/persona-config'
import { Send, ChevronDown, Copy, BookmarkPlus, RotateCcw } from 'lucide-react';
import { schedulePush } from '../utils/cloudSync'

/** Inline "BIBLE AI" wordmark sed wherever Brain icon used to be */
const BibleAIBadge = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const styles: Record<string, React.CSSProperties> = {
    sm: { fontSize: 9, padding:'2px 6px', borderRadius: 5, letterSpacing: '0.08em' },
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
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [seasonTipDismissed, setSeasonTipDismissed] = useState<boolean>(() => {
    return localStorage.getItem('dw_ai_season_tip_dismissed') === 'true'
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prefillProcessedRef = useRef(false)

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

  // Check for prefill from Bible Search
  useEffect(() => {
    if (isOpen && !prefillProcessedRef.current) {
      const prefill = localStorage.getItem('dw_ai_prefill');
      if (prefill) {
        prefillProcessedRef.current = true;
        localStorage.removeItem('dw_ai_prefill');
        setTimeout(() => sendMessage(prefill), 300);
      }
    } else if (!isOpen) {
      prefillProcessedRef.current = false;
    }
  }, [isOpen])

  // Mark AI as opened on first open
  useEffect(() => {
    if (isOpen && localStorage.getItem('dw_ai_opened_before') !== 'true') {
      localStorage.setItem('dw_ai_opened_before', 'true');
    }
  }, [isOpen])

  const abortRef = useRef<AbortController | null>(null)
  const [followUps, setFollowUps] = useState<string[]>([])

  function resetChat() {
    if (abortRef.current) abortRef.current.abort()
    setMessages([])
    setInput('')
    setLoading(false)
    setFollowUps([])
    setTimeout(() => inputRef.current?.focus(), 300)
  }

  // Generate follow-up suggestions from the last AI response
  function generateFollowUps(aiResponse: string): string[] {
    const suggestions: string[] = []
    // Context-aware follow-ups based on what the AI talked about
    if (aiResponse.includes('Greek') || aiResponse.includes('Hebrew') || aiResponse.includes('original')) {
      suggestions.push('What other words in this passage have interesting original meanings?')
    }
    if (aiResponse.includes('context') || aiResponse.includes('audience') || aiResponse.includes('written')) {
      suggestions.push('How does the historical context change how we read this?')
    }
    if (aiResponse.includes('apply') || aiResponse.includes('practical') || aiResponse.includes('life')) {
      suggestions.push('Give me a specific way to apply this today')
    }
    if (aiResponse.includes('cross-reference') || aiResponse.includes('other passage') || aiResponse.includes('also says')) {
      suggestions.push('What other passages connect to this theme?')
    }
    // Always offer these general ones if we don't have enough
    const general = [
      'Go deeper on this — what am I missing?',
      'How would you explain this to someone new to faith?',
      'What does this mean for my daily life?',
      'Are there any cross-references I should look at?',
    ]
    while (suggestions.length < 2) {
      const pick = general[Math.floor(Math.random() * general.length)]
      if (!suggestions.includes(pick)) suggestions.push(pick)
    }
    return suggestions.slice(0, 3)
  }

  async function sendMessage(text?: string) {
    const msg = text ?? input.trim()
    if (!msg) return
    // If already loading, abort the previous request so user isn't stuck
    if (loading && abortRef.current) {
      abortRef.current.abort()
      setLoading(false)
      return
    }
    if (loading) return
    setInput('')
    const userMsg: Message = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // Persona-aware system prompt
    const personaSetup = (() => { try { return JSON.parse(localStorage.getItem('dw_setup') || '{}'); } catch { return {}; } })();
    const personaConfig = getPersonaConfig(personaSetup.persona);

    const systemParts: string[] = [
      'You are a Bible study assistant for Futures Church Daily Word. You help people understand scripture, explore original languages, find application for daily life, and go deeper in their faith. Be warm, pastoral, and insightful. Keep responses clear and digestible — aim for 2-4 short paragraphs unless a longer answer is truly needed.',
      personaConfig.ai.systemPromptAddition,
    ]
    // Include user's personal context if they've shared it
    const userStory = typeof localStorage !== 'undefined' ? localStorage.getItem('dw_user_story') : null;
    if (userStory?.trim()) {
      systemParts.push(`About this person: ${userStory.trim()}\n\nLet this context inform how you apply scripture and give pastoral guidance — reference it naturally when it's genuinely relevant, without forcing it.`)
    }
    if (selectedText) systemParts.push(`The user has highlighted this passage: "${selectedText.substring(0, 600)}"`)
    if (initialContext) systemParts.push(initialContext)
    const systemPrompt = systemParts.join('\n\n')

    try {
      const controller = new AbortController()
      abortRef.current = controller
      const res = await fetch('/.netlify/functions/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          system: systemPrompt,
          max_tokens: 1024,
        }),
        signal: controller.signal,
      })
      const data = await res.json()
      const reply = data?.content?.[0]?.text ?? data?.error ?? 'Sorry, something went wrong. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setFollowUps(generateFollowUps(reply))
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        // User cancelled — don't add error message
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
      }
    } finally {
      abortRef.current = null
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 1500)
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      showToast('Copied!')
    } catch {
      showToast('Failed to copy')
    }
  }

  function saveToJournal(content: string) {
    try {
      const entry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        type: 'saved',
        title: 'Bible AI Response',
        body: content,
        tags: ['bible-ai'],
      }
      const journal = JSON.parse(localStorage.getItem('dw_journal') || '[]')
      journal.unshift(entry)
      localStorage.setItem('dw_journal', JSON.stringify(journal));
        try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
      window.dispatchEvent(new Event('dw-journal-updated'))
      showToast('Saved to Notes!')
    } catch {
      showToast('Failed to save')
    }
  }

  const promptsToShow = selectedText ? SELECTION_PROMPTS(selectedText) : QUICK_PROMPTS

  return (
    <>
      {/* Floating trigger button — burnished gold rectangle */}
      <button
        onClick={onOpen ?? (() => {})}
        aria-label="Bible AI"
        style={{
          position: 'fixed',
          bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
          right: 16,
          height: 36,
          padding: '0 14px',
          borderRadius: 8,
          background: 'linear-gradient(155deg, #4D2E00 0%, #9A6A08 18%, #C8920E 35%, #E8B910 50%, #F5CF55 58%, #D4A017 72%, #9A6A08 88%, #4D2E00 100%)',
          backgroundSize: '200% 200%',
          animation: 'aiAurora 4s ease infinite',
          border: '1px solid rgba(245,207,85,0.55)',
          boxShadow: '0 4px 22px rgba(160,110,8,0.7), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.22)',
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
          fontSize: 11, fontWeight: 900, color: '#fff',
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
              <span style={{ fontFamily: 'var(--font-serif-text)', fontSize: 17, fontWeight: 600, color: 'var(--dw-text)', display: 'block', lineHeight: 1.2 }}>
                Bible AI
              </span>
              <span style={{
                fontSize: 10, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                letterSpacing: '0.03em', display: 'block', marginTop: 1,
              }}>
                Ask anything about the Bible
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {messages.length > 0 && (
              <button
                onClick={resetChat}
                title="Start fresh"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--dw-text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'var(--font-sans)' }}
              >
                <RotateCcw size={15} /> New
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--dw-text-muted)' }}
            >
            <ChevronDown size={22} />
          </button>
          </div>
        </div>

        {/* Messages or empty state */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as any,
          overscrollBehavior: 'contain',
          padding: '12px 16px',
          minHeight: 0,
        }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 8px 16px' }}>
              {/* Season & Context tip banner */}
              {!seasonTipDismissed && !localStorage.getItem('dw_user_story') && (() => {
                const aiOpenedBefore = localStorage.getItem('dw_ai_opened_before') === 'true';
                return aiOpenedBefore ? null : (
                  <div style={{
                    background: 'rgba(154,123,46,0.10)',
                    border: '1px solid rgba(154,123,46,0.25)',
                    borderLeft: '3px solid #9A7B2E',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 16,
                    textAlign: 'left',
                    fontSize: 12,
                    color: 'var(--dw-text)',
                    fontFamily: 'var(--font-sans)',
                    lineHeight: 1.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 6 }}>
                        <strong>Tip:</strong> Tell Bible AI about your life season in Settings → My Season & Context. This makes every conversation more personal.
                      </div>
                      <button
                        onClick={() => {
                          setSeasonTipDismissed(true);
                          localStorage.setItem('dw_ai_season_tip_dismissed', 'true');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#D4B44C',
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: 0,
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ── TOP: Prominent input box — first thing the user sees ── */}
              <div style={{
                width: '100%',
                maxWidth: 380,
                margin: '0 auto 20px',
                position: 'relative',
              }}>
                <p style={{
                  fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--dw-text)',
                  marginBottom: 6, textAlign: 'center',
                }}>
                  {selectedText ? 'Go deeper on this passage' : 'Ask anything about the Bible'}
                </p>
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 14, textAlign: 'center' }}>
                  {selectedText
                    ? 'Context, meaning, language, application'
                    : 'Type your question below and press send'}
                </p>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedText ? 'Ask anything about this passage...' : 'e.g. What does Romans 8:28 mean?'}
                  rows={3}
                  style={{
                    width: '100%',
                    resize: 'none',
                    border: '2px solid var(--dw-accent, #A8323B)',
                    borderRadius: 16,
                    padding: '14px 56px 14px 16px',
                    fontSize: 16,
                    fontFamily: 'var(--font-sans)',
                    background: 'var(--dw-surface, #1A1A1A)',
                    color: 'var(--dw-text)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    lineHeight: 1.5,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <button aria-label="Send message"
                  onClick={() => {
                    if (loading) {
                      if (abortRef.current) abortRef.current.abort();
                      setLoading(false);
                    } else {
                      sendMessage();
                    }
                  }}
                  disabled={!loading && !input.trim()}
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 12,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: loading
                      ? 'var(--dw-accent)'
                      : input.trim()
                        ? 'linear-gradient(135deg, #7A5200, #C8920E, #F5C842)'
                        : 'var(--dw-border, #E8E6E0)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: loading || input.trim() ? 'pointer' : 'default',
                    transition: 'background 0.2s',
                    boxShadow: loading ? 'none' : input.trim() ? '0 2px 10px rgba(140,95,5,0.4)' : 'none',
                  }}
                >
                  {loading ? (
                    <div style={{ width: 14, height: 14, borderRadius: 2, background: '#fff' }} />
                  ) : (
                    <Send size={18} color={input.trim() ? '#fff' : 'var(--dw-text-muted)'} />
                  )}
                </button>
              </div>

              {/* Greek & Hebrew word study — standalone entry point */}
              <button
                onClick={() => {
                  const passage = selectedText ? `this passage: "${selectedText.substring(0, 120)}"` : 'today\'s reading';
                  sendMessage(`Break down the key Greek and Hebrew words in ${passage}. For each word, give me the original word, transliteration, Strong's number if known, and what it means in context.`);
                }}
                style={{
                  width: '100%',
                  maxWidth: 340,
                  margin: '0 auto 16px',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, rgba(154,123,46,0.12), rgba(154,123,46,0.06))',
                  border: '1px solid rgba(154,123,46,0.25)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 20 }}>Hebrew</span>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dw-text)', fontFamily: 'var(--font-sans)', display: 'block' }}>
                    Greek & Hebrew Word Meanings
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                    Original language breakdown
                  </span>
                </div>
              </button>

              <p style={{
                fontSize: 12, color: 'rgba(154,123,46,0.75)', fontFamily: 'var(--font-sans)',
                marginBottom: 14, letterSpacing: '0.03em',
              }}>
                — or choose a quick question —
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
                    onClick={() => { trackBehavior('ai_prompt', p); sendMessage(p); }}
                    style={{
                      background: 'var(--dw-card, #F5F3EF)',
                      border: '1px solid var(--dw-border, #E0DDD6)',
                      borderRadius: 10,
                      padding: '10px 16px',
                      fontSize: 13,
                      color: 'var(--dw-text, #1A1714)',
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
                <div key={i}>
                  <div
                    style={{
                      marginBottom: 14,
                      display: 'flex',
                      justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      role={m.role === 'assistant' ? 'assistant' : undefined}
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
                  {m.role === 'assistant' && (
                    <div style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 14,
                      justifyContent: 'flex-start',
                      paddingLeft: 0,
                    }}>
                      <button
                        onClick={() => copyToClipboard(m.content)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: 'var(--dw-text-muted)',
                          fontFamily: 'var(--font-sans)',
                          padding: '4px 8px',
                          borderRadius: 6,
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--dw-text-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--dw-text-muted)')}
                      >
                        <Copy size={12} />
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => saveToJournal(m.content)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: 'var(--dw-text-muted)',
                          fontFamily: 'var(--font-sans)',
                          padding: '4px 8px',
                          borderRadius: 6,
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--dw-text-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--dw-text-muted)')}
                      >
                        <BookmarkPlus size={12} />
                        <span>Save</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--dw-text-muted)',
                        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (abortRef.current) abortRef.current.abort();
                      setLoading(false);
                    }}
                    style={{
                      background: 'var(--dw-surface-hover)',
                      border: '1px solid var(--dw-border)',
                      borderRadius: 8,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--dw-text-muted)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    ■ Stop
                  </button>
                </div>
              )}
              {/* Follow-up suggestions after AI responds */}
              {!loading && followUps.length > 0 && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--dw-text-faint)', fontFamily: 'var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Keep going
                  </span>
                  {followUps.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setFollowUps([]); sendMessage(q); }}
                      style={{
                        background: 'var(--dw-card, #F5F3EF)',
                        border: '1px solid var(--dw-border, #E0DDD6)',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 12,
                        color: 'var(--dw-text)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        textAlign: 'left',
                        lineHeight: 1.4,
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input bar */}
        <div style={{
          padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px)) 12px',
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
          <button aria-label="Send message"
            onClick={() => {
              if (loading) {
                if (abortRef.current) abortRef.current.abort();
                setLoading(false);
              } else {
                sendMessage();
              }
            }}
            disabled={!loading && !input.trim()}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: loading
                ? 'var(--dw-accent)'
                : input.trim()
                  ? 'linear-gradient(135deg, #7A5200, #C8920E, #F5C842)'
                  : 'var(--dw-border, #E8E6E0)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading || input.trim() ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            {loading ? (
              <div style={{ width: 14, height: 14, borderRadius: 2, background: '#fff' }} />
            ) : (
              <Send size={17} color={input.trim() ? '#fff' : 'var(--dw-text-muted)'} />
            )}
          </button>
        </div>
      </div>

      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(26, 23, 20, 0.9)',
          color: '#fff',
          padding: '8px 14px',
          borderRadius: 8,
          fontSize: 12,
          fontFamily: 'var(--font-sans)',
          animation: 'fadeInOut 1.5s ease-in-out',
          zIndex: 95,
          pointerEvents: 'none',
        }}>
          {toastMessage}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  )
}
