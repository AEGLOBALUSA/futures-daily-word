import { ArrowLeft } from 'lucide-react';
import { t, getLang } from '../utils/i18n';

interface SermonNotesScreenProps {
  onBack: () => void;
}

export function SermonNotesScreen({ onBack }: SermonNotesScreenProps) {
  const lang = getLang();
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
        borderBottom: '1px solid var(--dw-border, rgba(255,255,255,0.1))',
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
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{t('sermon_notes_title', lang)}</h1>
      </div>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '32px 24px',
        textAlign: 'center',
        borderBottom: '3px solid var(--dw-gold, #C8A84E)',
      }}>
        <p style={{ fontSize: '13px', letterSpacing: '2px', color: '#C8A84E', marginBottom: '8px', textTransform: 'uppercase' }}>
          Futures Church &bull; March 2026
        </p>
        <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
          TAKE IT OFF
        </h2>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', margin: '0 0 4px 0' }}>
          Ephesians 4:22–24
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Pastor Ashley Evans
        </p>
      </div>

      {/* Key Verse */}
      <div style={{
        margin: '24px 20px',
        padding: '20px',
        background: 'rgba(200, 168, 78, 0.08)',
        borderLeft: '4px solid #C8A84E',
        borderRadius: '0 12px 12px 0',
      }}>
        <p style={{ fontSize: '15px', lineHeight: 1.7, fontStyle: 'italic', color: 'var(--dw-text)', margin: '0 0 8px 0' }}>
          &ldquo;You were taught, with regard to your former way of life, to put off your old self, which is being corrupted by its deceitful desires; to be made new in the attitude of your minds; and to put on the new self, created to be like God in true righteousness and holiness.&rdquo;
        </p>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#C8A84E', margin: 0 }}>
          — Ephesians 4:22–24 NIV
        </p>
      </div>

      {/* Sections */}
      <div style={{ padding: '0 20px' }}>

        <Section num="1" title="Identity Before the Message">
          <P>Identity is visible. It moves into the room before your mouth opens.</P>
          <P>The clothes are not matching the calling.</P>
          <P>God doesn’t just change your <Blank /><br />He changes your <Blank /></P>
          <P>The Holy Spirit’s instruction was not about fashion — it was about:<br />
            Wearing the clothes of who you <Blank /><br />
            Not the clothes of who you <Blank />
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
          <P style={{ fontSize: '13px', color: 'rgba(var(--dw-text-rgb, 255,255,255), 0.6)' }}>Greek: apothesthai — to strip off completely</P>
          <Bullet text="The old self is being corrupted — present tense, active decay" />
          <Bullet text="You cannot renovate something that is decomposing" />
          <Bullet text="You don’t patch rot. You strip it out." />
          <P>Covered up is not the same as <Blank /></P>

          <SubHead>Move 2: Be Made New</SubHead>
          <P style={{ fontSize: '13px', color: 'rgba(var(--dw-text-rgb, 255,255,255), 0.6)' }}>Greek: passive voice — something that happens TO you</P>
          <Bullet text="The old self was built by voices, wounds, and narratives you didn’t write" />
          <Bullet text="You cannot think your way out of something installed deeper than thought" />
          <P>God gets into the <Blank /><br />Not just the <Blank /></P>

          <SubHead>Move 3: Put On</SubHead>
          <P style={{ fontSize: '13px', color: 'rgba(var(--dw-text-rgb, 255,255,255), 0.6)' }}>Greek: endusasthai — to clothe yourself fully</P>
          <Bullet text="The new self is not a better version of the old self" />
          <Bullet text="It is a completely different creation — created to be like God" />
          <P><strong>Wrong self. Wrong outcome.</strong> &nbsp;|&nbsp; <strong>New self. Exceedingly. Abundantly. Above.</strong></P>
        </Section>

        <Section num="4" title="Paul Lived It — Philippians 3">
          <P>Paul’s old self was not a mess. It was the most impressive résumé in the room:</P>
          <Bullet text="Circumcised on the eighth day. Tribe of Benjamin. A Hebrew of Hebrews." />
          <Bullet text="A Pharisee. Student of Gamaliel. As for righteousness based on the law — faultless." />
          <Quote
            text="I consider everything a loss because of the surpassing worth of knowing Christ Jesus my Lord. For his sake I have suffered the loss of all things and count them as rubbish, in order that I may gain Christ."
            ref="Philippians 3:8 NIV"
          />
          <P><em>Skubalon</em> (Greek) — used once in the entire New Testament. Means: dung. Refuse. Waste.</P>
          <P>The old self God asks you to take off might be your most <Blank /><br />
            It’s not what God made for you — it’s what you made for <Blank />
          </P>
        </Section>

        <Section num="5" title="Elisha at the Jordan — 2 Kings 2">
          <Quote
            text="As they were walking along and talking together, suddenly a chariot of fire and horses of fire appeared and separated the two of them, and Elijah went up to heaven in a whirlwind."
            ref="2 Kings 2:11"
          />
          <Quote
            text="Elisha saw this and cried out, \u2018My father! My father! The chariots and horsemen of Israel!\u2019 And Elisha saw him no more. Then he took hold of his garment and tore it in two."
            ref="2 Kings 2:12"
          />
          <Quote
            text="Elisha then picked up Elijah\u2019s cloak that had fallen from him and went back and stood on the bank of the Jordan."
            ref="2 Kings 2:13"
          />
          <Quote
            text="Then he took the cloak of Elijah that had fallen from him and struck the water with it. \u2018Where is the Lord, the God of Elijah?\u2019 he asked. When he struck the water, it divided to the right and to the left, and he crossed over."
            ref="2 Kings 2:14"
          />
          <P>Before Elisha picked up the mantle — he tore off his own clothes.</P>
          <P><strong>You cannot pick up what God is dropping while you are still wearing what you arrived in.</strong></P>
          <Bullet text="The servant’s clothes could not hold the prophet’s mantle" />
          <Bullet text="He stripped them — not because they were bad, but because they were finished" />
          <Bullet text="The river responds to what you’re wearing, not what you’re holding" />
          <P>Same power. New <Blank /></P>
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
          <Bullet text="Cyril of Jerusalem: an imitation of Christ’s nakedness on the cross" />

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

        {/* My Response */}
        <div style={{
          margin: '32px 0',
          padding: '24px',
          background: 'rgba(200, 168, 78, 0.06)',
          borderRadius: '16px',
          border: '1px solid rgba(200, 168, 78, 0.2)',
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, textAlign: 'center', margin: '0 0 24px 0', color: '#C8A84E' }}>
            MY RESPONSE
          </h3>

          <ResponsePrompt label="What \u2018old self\u2019 is God asking me to take off?" />
          <ResponsePrompt label="What is the \u2018new self\u2019 God has prepared for me?" />
          <ResponsePrompt label="What is my next step?" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: '20px', height: '20px', accentColor: '#C8A84E' }} />
              I\u2019m getting baptised at Easter
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: '20px', height: '20px', accentColor: '#C8A84E' }} />
              I\u2019m ready to take off the old self today
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px 0 40px', opacity: 0.5, fontSize: '14px', fontWeight: 700, letterSpacing: '3px' }}>
          TAKE IT OFF
        </div>
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
        color: '#C8A84E',
      }}>
        {num}. &nbsp;{title}
      </h3>
      {children}
    </div>
  );
}

function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p style={{ fontSize: '15px', lineHeight: 1.75, margin: '0 0 12px 0', ...style }}>{children}</p>;
}

function Bullet({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: '10px', margin: '0 0 8px 0', paddingLeft: '4px' }}>
      <span style={{ color: '#C8A84E', fontWeight: 700, flexShrink: 0 }}>•</span>
      <span style={{ fontSize: '15px', lineHeight: 1.65 }}>{text}</span>
    </div>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '16px', fontWeight: 700, margin: '16px 0 6px 0' }}>{children}</p>;
}

function Blank() {
  return (
    <span style={{
      display: 'inline-block',
      borderBottom: '2px solid rgba(200, 168, 78, 0.4)',
      width: '160px',
      marginLeft: '4px',
    }}>&nbsp;</span>
  );
}

function Quote({ text, ref: reference }: { text: string; ref: string }) {
  return (
    <div style={{
      margin: '12px 0',
      padding: '16px',
      background: 'rgba(200, 168, 78, 0.06)',
      borderLeft: '3px solid #C8A84E',
      borderRadius: '0 8px 8px 0',
    }}>
      <p style={{ fontSize: '14px', lineHeight: 1.7, fontStyle: 'italic', margin: '0 0 4px 0' }}>
        &ldquo;{text}&rdquo;
      </p>
      <p style={{ fontSize: '12px', fontWeight: 700, color: '#C8A84E', margin: 0 }}>
        — {reference}
      </p>
    </div>
  );
}

function ResponsePrompt({ label }: { label: string }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0' }}>{label}</p>
      <div style={{
        borderBottom: '1px solid rgba(200, 168, 78, 0.3)',
        paddingBottom: '24px',
        marginBottom: '4px',
      }} />
      <div style={{ borderBottom: '1px solid rgba(200, 168, 78, 0.3)', paddingBottom: '24px', marginBottom: '4px' }} />
      <div style={{ borderBottom: '1px solid rgba(200, 168, 78, 0.3)', paddingBottom: '24px' }} />
    </div>
  );
}

export default SermonNotesScreen;
