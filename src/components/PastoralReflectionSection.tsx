/**
 * PastoralReflectionSection — the "Between You & God" daily reflection prompt for
 * the pastor_leader persona, extracted from HomeScreen. Owns no state; reads the
 * persona's journal prompts and routes "Journal This" / "Talk It Through" back to
 * HomeScreen via the passed callbacks (journal prefill + Bible AI context).
 */
import { Card } from './Card';
import type { TabId } from './TabBar';
import type { PersonaConfig } from '../utils/persona-config';

interface PastoralReflectionSectionProps {
  personaConfig: PersonaConfig;
  dayOffset: number;
  getDayNumber: (dayOffset?: number) => number;
  onNavigate?: (tab: TabId) => void;
  setBibleAIContext: (context: string) => void;
  setShowBibleAI: (show: boolean) => void;
}

export function PastoralReflectionSection({
  personaConfig, dayOffset, getDayNumber, onNavigate, setBibleAIContext, setShowBibleAI,
}: PastoralReflectionSectionProps) {
          const prompts = personaConfig.journal.prompts;
          if (!prompts || prompts.length === 0) return null;
          const promptIdx = getDayNumber(dayOffset) % prompts.length;
          const todayPrompt = prompts[promptIdx];

          return (
            <Card className="dw-dark-surface" style={{ marginBottom: 16, background: 'linear-gradient(135deg, var(--dw-charcoal), var(--dw-charcoal-deep))' }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              }}>
                Between You & God
              </p>
              <p style={{
                fontSize: 16, lineHeight: 1.5, color: 'var(--dw-text-primary)',
                fontFamily: 'var(--font-serif-text, Georgia, serif)', fontStyle: 'italic', margin: 0,
              }}>
                {todayPrompt}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  className="dw-btn-dark"
                  onClick={() => {
                    try {
                      localStorage.setItem('dw_journal_prefill', JSON.stringify({
                        prompt: todayPrompt,
                        date: new Date().toISOString().slice(0, 10),
                        type: 'pastoral-reflection',
                      }));
                    } catch {}
                    onNavigate?.('journal');
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    background: 'var(--dw-accent)', border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    color: '#fff', fontFamily: 'var(--font-sans)',
                  }}
                >
                  Journal This
                </button>
                <button
                  onClick={() => {
                    setBibleAIContext(`I'm a pastor reflecting on my day. The prompt was: "${todayPrompt}" — I'd like to talk through what's on my heart.`);
                    setShowBibleAI(true);
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    background: 'transparent', border: '1px solid var(--dw-border)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)',
                  }}
                >
                  Talk It Through
                </button>
              </div>
            </Card>
          );
}
