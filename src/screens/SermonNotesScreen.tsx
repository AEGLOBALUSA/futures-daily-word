import { useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { t, getLang } from '../utils/i18n';

interface SermonNotesScreenProps {
  onBack: () => void;
  embedded?: boolean;
}

/* ── localStorage for user's fill-in responses ── */
function getSermonResponses(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('dw_sermon_responses') || '{}'); } catch { return {}; }
}
function saveSermonResponses(r: Record<string, string>) {
  localStorage.setItem('dw_sermon_responses', JSON.stringify(r));
}

export function SermonNotesScreen({ onBack, embedded }: SermonNotesScreenProps) {
  const lang = getLang();
  const [responses, setResponses] = useState(getSermonResponses);

  const updateResponse = useCallback((key: string, value: string) => {
    setResponses(prev => {
      const next = { ...prev, [key]: value };
      saveSermonResponses(next);
      return next;
    });
  }, []);

  const content = (
    <>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--dw-charcoal-deep) 0%, var(--dw-charcoal) 50%, var(--dw-charcoal-light) 100%)',
        padding: '32px 24px',
        textAlign: 'center',
        borderBottom: '3px solid var(--dw-accent)',
        borderRadius: embedded ? 14 : 0,
        marginBottom: embedded ? 20 : 0,
      }}>
        <p style={{ fontSize: '13px', letterSpacing: '2px', color: 'var(--dw-accent)', marginBottom: '8px', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
          Futures Church &bull; March 2026
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px 0', letterSpacing: '-0.5px', fontFamily: 'var(--font-serif)' }}>
          TAKE IT OFF
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', margin: '0 0 4px 0', fontFamily: 'var(--font-sans)' }}>
          Ephesians 4:22–24
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, fontFamily: 'var(--font-sans)' }}>
          Pastor Ashley Evans
        </p>
      </div>

      {/* Key Verse */}
      <div style={{
        margin: '24px 0',
        padding: '20px',
        background: 'var(--dw-accent-bg)',
        borderLeft: '4px solid var(--dw-accent)',
        borderRadius: '0 12px 12px 0',
      }}>
        <p style={{ fontSize: '15px', lineHeight: 1.7, fontStyle: 'italic', color: 'var(--dw-text-primary)', margin: '0 0 8px 0', fontFamily: 'var(--font-serif-text)' }}>
          &ldquo;You were taught, with regard to your former way of life, to put off your old self, which is being corrupted by its deceitful desires; to be made new in the attitude of your minds; and to put on the new self, created to be like God in true righteousness and holiness.&rdquo;
        </p>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--dw-accent)', margin: 0, fontFamily: 'var(--font-sans)' }}>
          — Ephesians 4:22–24 NIV
        </p>
      </div>

      {/* Sections */}
      <div>
        <Section num="1" title="Identity Before the Message">
          <P>Identity is visible. It moves into the room before your mouth opens.</P>
          <P>The clothes are not matching the calling.</P>
          <P>God doesn't just change your <Blank id="1a" responses={responses} onChange={updateResponse} /><br />He changes your <Blank id="1b" responses={responses} onChange={updateResponse} /></P>
          <P>The Holy Spirit's instruction was not about fashion — it was about:<br />
            Wearing the clothes of who you <Blank id="1c" responses={responses} onChange={updateResponse} /><br />
            Not the clothes of who you <Blank id="1d" responses={responses} onChange={updateResponse} />
          </P>
        </Section>

        <Section num="2" title="Who Is Doing the Carrying?">
          <P>You can choose the right power and still walk into the room wearing the wrong self.</P>
          <Bullet text="Right theology + wrong identity = broken delivery" />
          <Bullet text="The fuel can be perfect but the delivery system is broken" />
          <P>You cannot carry the right power in the wrong identity.</P>
        </Section>

        <Section num="3" title="Three Moves — Ephesians 4:22–24">
          <P>Paul gives us a complete wardrobe transaction. Three moves:</P>

          <SubHead>Move 1: Put Off</SubHead>
          <P style={{ fontSize: '13px', color: 'var(--dw-text-muted)' }}>Greek: apothesthai — to strip off completely</P>
          <Bullet text="The old self is being corrupted — present tense, active decay" />
          <Bullet text="You cannot renovate something that is decomposing" />
          <Bullet text="You don't patch rot. You strip it out." />
          <P>Covered up is not the same as <Blank id="3a" responses={responses} onChange={updateResponse} /></P>

          <SubHead>Move 2: Be Made New</SubHead>
          <P style={{ fontSize: '13px', color: 'var(--dw-text-muted)' }}>Greek: passive voice — something that happens TO you</P>
          <Bullet text="The old self was built by voices, wounds, and narratives you didn't write" />
          <Bullet text="You cannot think your way out of something installed deeper than thought" />
          <P>God gets into the <Blank id="3b" responses={responses} onChange={updateResponse} /><br />Not just the <Blank id="3c" responses={responses} onChange={updateResponse} /></P>

          <SubHead>Move 3: Put On</SubHead>
          <P style={{ fontSize: '13px', color: 'var(--dw-text-muted)' }}>Greek: endusasthai — to clothe yourself fully</P>
          <Bullet text="The new self is not a better version of the old self" />
          <Bullet text="It is a completely different creation — created to be like God" />
          <P><strong>Wrong self. Wrong outcome.</strong> &nbsp;|&nbsp; <strong>New self. Exceedingly. Abundantly. Above.</strong></P>
        </Section>

        <Section num="4" title="Paul Lived It — Philippians 3">
          <P>Paul's old self was not a mess. It was the most impressive résumé in the room:</P>
          <Bullet text="Circumcised on the eighth day. Tribe of Benjamin. A Hebrew of Hebrews." />
          <Bullet text="A Pharisee. Student of Gamaliel. As for righteousness based on the law — faultless." />
          <Quote
            text="I consider everything a loss because of the surpassing worth of knowing Christ Jesus my Lord. For his sake I have suffered the loss of all things and count them as rubbish, in order that I may gain Christ."
            ref="Philippians 3:8 NIV"
          />
          <P><em>Skubalon</em> (Greek) — used once in the entire New Testament. Means: dung. Refuse. Waste.</P>
          <P>The old self God asks you to take off might be your most <Blank id="4a" responses={responses} onChange={updateResponse} /><br />
            It's not what God made for you — it's what you made for <Blank id="4b" responses={responses} onChange={updateResponse} />
          </P>
        </Section>

        <Section num="5" title="Elisha at the Jordan — 2 Kings 2">
          <Quote
            text="As they were walking along and talking together, suddenly a chariot of fire and horses of fire appeared and separated the two of them, and Elijah went up to heaven in a whirlwind."
            ref="2 Kings 2:11"
          />
          <Quote
            text="Elisha saw this and cried out, 'My father! My father! The chariots and horsemen of Israel!' And Elisha saw him no more. Then he took hold of his garment and tore it in two."
            ref="2 Kings 2:12"
          />
          <Quote
            text="Elisha then picked up Elijah's cloak that had fallen from him and went back and stood on the bank of the Jordan."
            ref="2 Kings 2:13"
          />
          <Quote
            text="Then he took the cloak of Elijah that had fallen from him and struck the water with it. 'Where is the Lord, the God of Elijah?' he asked. When he struck the water, it divided to the right and to the left, and he crossed over."
            ref="2 Kings 2:14"
          />
          <P>Before Elisha picked up the mantle — he tore off his own clothes.</P>
          <P><strong>You cannot pick up what God is dropping while you are still wearing what you arrived in.</strong></P>
          <Bullet text="The servant's clothes could not hold the prophet's mantle" />
          <Bullet text="He stripped them — not because they were bad, but because they were finished" />
          <Bullet text="The river responds to what you're wearing, not what you're holding" />
          <P>Same power. New <Blank id="5a" responses={responses} onChange={updateResponse} /></P>
        </Section>

        <Section num="6" title="What the Early Church Did — Baptism">
          <SubHead>The Easter Baptism Vigil (2nd–4th Century)</SubHead>
          <Bullet text="Baptism happened once a year — only on Easter, before sunrise" />
          <Bullet text='Candidates faced west and renounced Satan out loud' />
          <Quote
            text="I renounce thee, Satan, and all thy works, and all thy pomps."
            ref="Early Church Baptismal Declaration"
          />
          <Bullet text="Then turned east toward the risen Christ and declared their faith" />
          <Bullet text="Stripped of everything before entering the water — nothing carried across" />
          <Bullet text="Cyril of Jerusalem: an imitation of Christ's nakedness on the cross" />

          <SubHead>The White Robe</SubHead>
          <Bullet text="Came up from the water — someone was waiting with a pure white robe" />
          <Quote
            text="The servant of God is clothed with the robe of righteousness."
            ref="Early Church Baptismal Prayer"
          />
          <Bullet text="In the Eastern church they wore the white robe for the full eight days of Easter" />
          <P><strong>Coming to Christ is not behaviour modification. It is a wardrobe change.</strong></P>
          <P>We are two weeks from Easter. We are doing baptisms.<br />
            Baptism is not a graduation ceremony. It is for people who are ready to take it off.
          </P>
        </Section>

        <Section num="7" title="The Jordan River Moment">
          <P>Picture yourself at the Jordan River. Old clothes on.</P>
          <P>
            Take off the shrunken self → Put on the self that stands with shoulders back<br />
            Take off the wounded self → Put on the self rooted and established in love<br />
            Take off the self waiting for permission → Put on the self God commissioned<br />
            Take off the afraid self → Put on the self that walks to the Jordan and shouts:
          </P>
          <Quote text="Where is the God of Elijah?" ref="2 Kings 2:14" />
          <P>He is still here. He is the same God.</P>
          <P><strong>He took it off so you could put it on. That is the gospel in one sentence.</strong></P>
        </Section>

        {/* My Response — interactive text areas */}
        <div style={{
          margin: '32px 0',
          padding: '24px',
          background: 'var(--dw-accent-bg)',
          borderRadius: '16px',
          border: '1px solid var(--dw-border)',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, textAlign: 'center', margin: '0 0 24px 0', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', letterSpacing: '0.08em' }}>
            MY RESPONSE
          </h3>

          <ResponsePrompt id="resp-1" label="What 'old self' is God asking me to take off?" responses={responses} onChange={updateResponse} />
          <ResponsePrompt id="resp-2" label="What is the 'new self' God has prepared for me?" responses={responses} onChange={updateResponse} />
          <ResponsePrompt id="resp-3" label="What is my next step?" responses={responses} onChange={updateResponse} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', cursor: 'pointer', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>
              <input
                type="checkbox"
                checked={responses['check-baptism'] === '1'}
                onChange={e => updateResponse('check-baptism', e.target.checked ? '1' : '')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--dw-accent)' }}
              />
              I'm getting baptised at Easter
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', cursor: 'pointer', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>
              <input
                type="checkbox"
                checked={responses['check-ready'] === '1'}
                onChange={e => updateResponse('check-ready', e.target.checked ? '1' : '')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--dw-accent)' }}
              />
              I'm ready to take off the old self today
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px 0 40px', color: 'var(--dw-text-faint)', fontSize: '14px', fontWeight: 700, letterSpacing: '3px', fontFamily: 'var(--font-sans)' }}>
          TAKE IT OFF
        </div>
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--dw-canvas)',
      color: 'var(--dw-text)',
      padding: '0 0 100px 0',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid var(--dw-border)',
        position: 'sticky',
        top: 0,
        background: 'var(--dw-canvas)',
        zIndex: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--dw-text)',
            cursor: 'pointer',
            padding: '8px',
            marginRight: '12px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, fontFamily: 'var(--font-serif)' }}>{t('sermon_notes_title', lang)}</h1>
      </div>

      <div style={{ padding: '0 20px' }}>
        {content}
      </div>
    </div>
  );
}

/* ---- Helper components ---- */

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 700,
        margin: '28px 0 12px 0',
        color: 'var(--dw-accent)',
        fontFamily: 'var(--font-serif)',
      }}>
        {num}. &nbsp;{title}
      </h3>
      {children}
    </div>
  );
}

function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p style={{ fontSize: '15px', lineHeight: 1.75, margin: '0 0 12px 0', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', ...style }}>{children}</p>;
}

function Bullet({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: '10px', margin: '0 0 8px 0', paddingLeft: '4px' }}>
      <span style={{ color: 'var(--dw-accent)', fontWeight: 700, flexShrink: 0 }}>•</span>
      <span style={{ fontSize: '15px', lineHeight: 1.65, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>{text}</span>
    </div>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '16px', fontWeight: 700, margin: '16px 0 6px 0', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>{children}</p>;
}

function Blank({ id, responses, onChange }: { id: string; responses: Record<string, string>; onChange: (id: string, val: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      value={responses[`blank-${id}`] || ''}
      onChange={e => onChange(`blank-${id}`, e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder="________"
      style={{
        display: 'inline-block',
        borderBottom: focused ? '2px solid var(--dw-accent)' : '2px solid var(--dw-border)',
        border: 'none',
        borderBottomWidth: 2,
        borderBottomStyle: 'solid',
        borderBottomColor: focused ? 'var(--dw-accent)' : 'var(--dw-border)',
        background: 'transparent',
        width: 160,
        marginLeft: 4,
        padding: '2px 4px',
        fontSize: 15,
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        color: 'var(--dw-accent)',
        outline: 'none',
        transition: 'border-color 0.2s',
      }}
    />
  );
}

function Quote({ text, ref: reference }: { text: string; ref: string }) {
  return (
    <div style={{
      margin: '12px 0',
      padding: '16px',
      background: 'var(--dw-accent-bg)',
      borderLeft: '3px solid var(--dw-accent)',
      borderRadius: '0 8px 8px 0',
    }}>
      <p style={{ fontSize: '14px', lineHeight: 1.7, fontStyle: 'italic', margin: '0 0 4px 0', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif-text)' }}>
        &ldquo;{text}&rdquo;
      </p>
      <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dw-accent)', margin: 0, fontFamily: 'var(--font-sans)' }}>
        — {reference}
      </p>
    </div>
  );
}

function ResponsePrompt({ id, label, responses, onChange }: { id: string; label: string; responses: Record<string, string>; onChange: (id: string, val: string) => void }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>{label}</p>
      <textarea
        value={responses[id] || ''}
        onChange={e => onChange(id, e.target.value)}
        placeholder="Write your thoughts here..."
        style={{
          width: '100%',
          minHeight: 80,
          padding: '12px 14px',
          background: 'var(--dw-surface)',
          border: '1px solid var(--dw-border)',
          borderRadius: 10,
          color: 'var(--dw-text-primary)',
          fontSize: 14,
          fontFamily: 'var(--font-sans)',
          lineHeight: 1.6,
          resize: 'vertical',
          outline: 'none',
        }}
      />
    </div>
  );
}

export default SermonNotesScreen;
