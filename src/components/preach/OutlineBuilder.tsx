/**
 * OutlineBuilder — the Preach workspace's outline step (Phase 3 §4.3).
 *
 * Big idea, up to 5 points (heading + body), a weekly action, an optional
 * framework scaffold (Ashley's own, from "Multiply or Die"), and a "Seed from
 * my highlights" shortcut that pulls the newest sermon-prep captures straight
 * into empty point bodies. Auto-saves 400ms after the last keystroke through
 * src/utils/preachOutline.ts, which rides the existing misc cloud-sync bag —
 * nothing here talks to localStorage or the network directly.
 *
 * Pastor-only by construction: this component is only ever mounted from the
 * hidden Preach tab, gated the same way the rest of that workspace is.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Check, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { t } from '../../utils/i18n';
import {
  loadOutline, saveOutline, outlineToNotes, seedFromPrep, applyFramework,
  capOutline, MIN_POINTS, MAX_POINTS,
} from '../../utils/preachOutline';
import type { PreachOutline } from '../../utils/preachOutline';
import { PREACH_FRAMEWORKS } from '../../data/preach-frameworks';
import { getPrepItems } from '../../utils/sermonPrep';

type SaveState = 'idle' | 'saving' | 'saved';

export function OutlineBuilder({ lang, onChange }: { lang: string; onChange?: (o: PreachOutline) => void }) {
  const [outline, setOutline] = useState<PreachOutline>(() => loadOutline());
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [truncated, setTruncated] = useState(false);
  const [prepCount, setPrepCount] = useState(() => getPrepItems().length);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const h = () => setPrepCount(getPrepItems().length);
    window.addEventListener('dw-sermon-prep-updated', h);
    return () => window.removeEventListener('dw-sermon-prep-updated', h);
  }, []);

  // A cloud pull (newest-wins for dw_preach_outline) may have replaced the
  // stored outline under us; re-read it when no edit is pending.
  useEffect(() => {
    const h = () => { if (!pendingRef.current) setOutline(loadOutline()); };
    window.addEventListener('dw-cloud-sync', h);
    return () => window.removeEventListener('dw-cloud-sync', h);
  }, []);

  // A pending debounced save is FLUSHED on unmount, never dropped — switching
  // segments within 400 ms of the last keystroke must not lose that keystroke.
  const pendingRef = useRef<PreachOutline | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (pendingRef.current) {
      const next = pendingRef.current;
      pendingRef.current = null;
      saveOutline(next);
      onChangeRef.current?.(next);
    }
  }, []);

  // Debounced auto-save: state updates immediately (so the fields feel live),
  // the actual write + onChange fire together 400ms after the last edit.
  const commit = useCallback((next: PreachOutline) => {
    setOutline(next);
    setSaveState('saving');
    pendingRef.current = next;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      pendingRef.current = null;
      const { truncated: didTruncate } = capOutline(next);
      setTruncated(didTruncate);
      saveOutline(next);
      onChange?.(next);
      setSaveState('saved');
    }, 400);
  }, [onChange]);

  const setField = <K extends keyof PreachOutline>(key: K, value: PreachOutline[K]) => {
    commit({ ...outline, [key]: value });
  };

  const setPointField = (index: number, field: 'heading' | 'body', value: string) => {
    const points = outline.points.map((p, i) => i === index ? { ...p, [field]: value } : p);
    commit({ ...outline, points });
  };

  const addPoint = () => {
    if (outline.points.length >= MAX_POINTS) return;
    commit({ ...outline, points: [...outline.points, { heading: '', body: '' }] });
  };

  const removePoint = (index: number) => {
    if (outline.points.length <= MIN_POINTS) return;
    commit({ ...outline, points: outline.points.filter((_, i) => i !== index) });
  };

  const handleSeed = () => {
    const items = getPrepItems();
    if (items.length === 0) return;
    commit(seedFromPrep(outline, items));
  };

  const handleFramework = (id: string) => {
    commit(applyFramework(outline, id));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 18, marginBottom: 10 }}>
        <SavePill state={saveState} lang={lang} />
      </div>

      {truncated && (
        <p data-testid="outline-truncated-warning" style={{
          fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
          margin: '0 0 12px', lineHeight: 1.5,
        }}>
          {t('preach_size_warning', lang)}
        </p>
      )}

      <Card>
        <Field label={t('preach_field_title', lang)}>
          <TextInput
            testId="outline-title"
            value={outline.title}
            placeholder={t('preach_field_title_ph', lang)}
            onChange={v => setField('title', v)}
          />
        </Field>
        <Field label={t('preach_field_passage', lang)}>
          <TextInput
            testId="outline-passage"
            value={outline.passage}
            placeholder={t('preach_field_passage_ph', lang)}
            onChange={v => setField('passage', v)}
          />
        </Field>
        <Field label={t('preach_field_series', lang)}>
          <TextInput
            testId="outline-series"
            value={outline.series}
            placeholder={t('preach_field_series_ph', lang)}
            onChange={v => setField('series', v)}
          />
        </Field>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label={t('preach_field_date', lang)}>
              <input
                data-testid="outline-date"
                type="date"
                value={outline.date}
                onChange={e => setField('date', e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label={t('preach_field_speaker', lang)}>
              <TextInput
                testId="outline-speaker"
                value={outline.speaker}
                placeholder={t('preach_field_speaker_ph', lang)}
                onChange={v => setField('speaker', v)}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <Field label={t('preach_field_big_idea', lang)}>
          <AutoGrow
            testId="outline-big-idea"
            value={outline.bigIdea}
            placeholder={t('preach_field_big_idea_ph', lang)}
            onChange={v => setField('bigIdea', v)}
            minRows={2}
          />
        </Field>
      </Card>

      <Card>
        <p style={sectionLabelStyle}>{t('preach_points_label', lang)}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {outline.points.map((point, i) => (
            <div key={i} style={{
              border: '1px solid var(--dw-border)', borderRadius: 12, padding: '12px 14px',
              background: 'var(--dw-surface)',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input
                  data-testid={`outline-point-heading-${i}`}
                  value={point.heading}
                  placeholder={t('preach_point_heading_ph', lang)}
                  onChange={e => setPointField(i, 'heading', e.target.value)}
                  style={{ ...inputStyle, flex: 1, fontWeight: 700 }}
                />
                {outline.points.length > MIN_POINTS && (
                  <button
                    type="button"
                    aria-label={t('remove_label', lang)}
                    data-testid={`outline-remove-point-${i}`}
                    onClick={() => removePoint(i)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--dw-text-muted)',
                      cursor: 'pointer', minWidth: 44, minHeight: 44,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <AutoGrow
                testId={`outline-point-body-${i}`}
                value={point.body}
                placeholder={t('preach_point_body_ph', lang)}
                onChange={v => setPointField(i, 'body', v)}
                minRows={2}
              />
            </div>
          ))}
        </div>
        {outline.points.length < MAX_POINTS && (
          <button
            type="button"
            data-testid="outline-add-point"
            onClick={addPoint}
            style={{
              marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px dashed var(--dw-border)', borderRadius: 10,
              padding: '9px 14px', minHeight: 44, cursor: 'pointer',
              color: 'var(--dw-accent)', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)',
            }}
          >
            <Plus size={15} /> {t('preach_add_point', lang)}
          </button>
        )}
      </Card>

      <Card>
        <Field label={t('preach_field_weekly_action', lang)}>
          <AutoGrow
            testId="outline-weekly-action"
            value={outline.weeklyAction}
            placeholder={t('preach_field_weekly_action_ph', lang)}
            onChange={v => setField('weeklyAction', v)}
            minRows={2}
          />
        </Field>
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: prepCount === 0 ? 6 : 0 }}>
          <button
            type="button"
            data-testid="outline-seed-button"
            onClick={handleSeed}
            disabled={prepCount === 0}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: prepCount === 0 ? 'var(--dw-surface)' : 'var(--dw-accent-bg, rgba(168,85,47,0.1))',
              border: `1px solid ${prepCount === 0 ? 'var(--dw-border)' : 'var(--dw-accent)'}`,
              borderRadius: 10, padding: '9px 16px', minHeight: 44,
              cursor: prepCount === 0 ? 'not-allowed' : 'pointer',
              color: prepCount === 0 ? 'var(--dw-text-muted)' : 'var(--dw-accent)',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)',
            }}
          >
            <Sparkles size={15} /> {t('preach_seed_button', lang)}
          </button>
        </div>
        {prepCount === 0 && (
          <p data-testid="outline-seed-empty-note" style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.5 }}>
            {t('preach_seed_empty', lang)}
          </p>
        )}
      </Card>

      <Card>
        <p style={sectionLabelStyle}>{t('preach_framework_label', lang)}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="listbox">
          <FrameworkChip
            testId="outline-framework-chip-none"
            active={!outline.framework}
            name={t('preach_framework_none', lang)}
            onClick={() => handleFramework('')}
          />
          {PREACH_FRAMEWORKS.map(fw => (
            <FrameworkChip
              key={fw.id}
              testId={`outline-framework-chip-${fw.id}`}
              active={outline.framework === fw.id}
              name={fw.name}
              source={fw.source}
              lang={lang}
              onClick={() => handleFramework(fw.id)}
            />
          ))}
        </div>
      </Card>

      <Card>
        <p style={sectionLabelStyle}>{t('preach_preview_heading', lang)}</p>
        <pre
          data-testid="outline-preview"
          style={{
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontFamily: 'var(--font-serif-text, Georgia, serif)', fontStyle: 'normal',
            fontSize: 14, lineHeight: 1.7, color: 'var(--dw-text-secondary)',
          }}
        >
          {outlineToNotes(outline) || t('preach_preview_empty', lang)}
        </pre>
      </Card>
    </div>
  );
}

function SavePill({ state, lang }: { state: SaveState; lang: string }) {
  return (
    <span data-testid="outline-save-pill" aria-live="polite" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontFamily: 'var(--font-sans)',
      color: state === 'saved' ? 'var(--dw-success)' : 'var(--dw-text-muted)',
      minHeight: 16,
    }}>
      {state === 'saving' && <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> {t('note_saving', lang)}</>}
      {state === 'saved' && <><Check size={13} /> {t('note_saved', lang)}</>}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
      borderRadius: 16, padding: '18px 20px', marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 6px' }}>
        {label}
      </p>
      {children}
    </div>
  );
}

const sectionLabelStyle: CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', margin: '0 0 12px',
};

const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
  background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
  borderRadius: 10, color: 'var(--dw-text-primary)',
  fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none', minHeight: 44,
};

function TextInput({ value, onChange, placeholder, testId }: {
  value: string; onChange: (v: string) => void; placeholder?: string; testId?: string;
}) {
  return (
    <input
      data-testid={testId}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

function FrameworkChip({ active, name, source, lang, onClick, testId }: {
  active: boolean; name: string; source?: string; lang?: string; onClick: () => void; testId: string;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-testid={testId}
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left',
        minHeight: 44, padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--dw-accent)' : 'var(--dw-border)'}`,
        background: active ? 'var(--dw-accent)' : 'var(--dw-card)',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)', color: active ? '#fff' : 'var(--dw-text-primary)' }}>
        {name}
      </span>
      {source && (
        <span style={{ fontSize: 10, fontFamily: 'var(--font-sans)', color: active ? 'rgba(255,255,255,0.85)' : 'var(--dw-text-muted)' }}>
          {t('preach_framework_from', lang).replace('{source}', source)}
        </span>
      )}
    </button>
  );
}

/** Auto-expanding textarea — grows with content, no inner scrollbar.
 *  Copied from SermonWorkspace.tsx's AutoGrow idiom, not imported (that file
 *  is owned by another agent). */
function AutoGrow({ value, onChange, placeholder, minRows, testId }: {
  value: string; onChange: (val: string) => void; placeholder?: string; minRows?: number; testId?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);
  useEffect(() => { resize(); }, [value, resize]);
  return (
    <textarea
      ref={ref}
      data-testid={testId}
      value={value}
      onChange={e => { onChange(e.target.value); resize(); }}
      placeholder={placeholder}
      rows={minRows || 2}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '12px 14px',
        background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
        borderRadius: 12, color: 'var(--dw-text-primary)',
        fontSize: 15, fontFamily: 'var(--font-sans)', lineHeight: 1.7,
        resize: 'none', outline: 'none', overflow: 'hidden',
      }}
    />
  );
}

export default OutlineBuilder;
