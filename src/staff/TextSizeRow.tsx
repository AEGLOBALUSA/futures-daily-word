import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { getLang, t } from '../utils/i18n';
import { fs, type TextSizeStep } from '../lib/mos/text-size/text-scale-core';

type TextSizeWindow = Window & { MOSText?: { current(): string; steps: readonly TextSizeStep[] } };

function currentStep(): TextSizeStep | null {
  const runtime = (window as TextSizeWindow).MOSText;
  return runtime?.steps.find((step) => step.key === runtime.current()) ?? null;
}

export function TextSizeRow({ lang = getLang(), sidebar = false }: { lang?: string; sidebar?: boolean }) {
  const [size, setSize] = useState<TextSizeStep | null>(null);
  const [status, setStatus] = useState<{ saved: string } | 'loading' | null>(null);
  const [loadError, setLoadError] = useState(false);
  const opening = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const picker = useRef<HTMLElement>(null);
  const changeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const labels = JSON.stringify({
    title: t('staff_text_size', lang), sample: t('staff_text_size_sample', lang),
    save: t('staff_text_size_save', lang), cancel: t('staff_text_size_cancel', lang),
    default: t('staff_text_size_default', lang), hint: t('staff_text_size_hint', lang),
    saved: t('staff_text_size_saved', lang),
  });

  useEffect(() => setStatus(null), [lang]);

  useEffect(() => {
    let mounted = true;
    const element = picker.current;
    const update = () => { if (mounted) setSize(currentStep()); };
    const onSave = () => {
      const step = currentStep();
      setSize(step);
      dialog.current?.close();
      setStatus(step ? { saved: step.label } : null);
    };
    const onCancel = () => { setStatus(null); dialog.current?.close(); };
    window.addEventListener('mos-text-change', update);
    element?.addEventListener('change', onSave);
    element?.addEventListener('cancel', onCancel);
    update();
    void window.customElements.whenDefined('mos-text-size').then(update);
    return () => {
      mounted = false;
      window.removeEventListener('mos-text-change', update);
      element?.removeEventListener('change', onSave);
      element?.removeEventListener('cancel', onCancel);
    };
  }, []);

  const currentLabel = t(size && size.key !== 'default'
    ? 'staff_text_size_current' : 'staff_text_size_current_default', lang)
    .replace('{percent}', size?.label ?? '100%');

  async function openPicker() {
    if (opening.current || dialog.current?.open) return;
    opening.current = true;
    setLoadError(false);
    let timeout: number | undefined;
    try {
      if (!window.customElements.get('mos-text-size')) {
        setStatus('loading');
        const loaded = await Promise.race([
          window.customElements.whenDefined('mos-text-size').then(() => true),
          new Promise<boolean>((resolve) => { timeout = window.setTimeout(() => resolve(false), 8000); }),
        ]);
        if (!dialog.current) return;
        if (!loaded) { setStatus(null); setLoadError(true); return; }
      }
      if (!dialog.current) return;
      setSize(currentStep());
      dialog.current.showModal();
      setStatus(null);
    } catch {
      if (dialog.current) { setStatus(null); setLoadError(true); }
    } finally {
      window.clearTimeout(timeout);
      opening.current = false;
    }
  }

  return (
    <div className="staff-text-size-row" style={{
      minWidth: 0, width: '100%', fontFamily: 'var(--font-sans)', overflowWrap: 'anywhere',
      '--mos-control-height': '44px', '--mos-nav-item-height': '44px',
    } as CSSProperties}>
      <button
        ref={changeButton} type="button" className="staff-text-size-row__button"
        aria-haspopup="dialog" aria-busy={status === 'loading'} onClick={() => void openPicker()}
        style={{
          width: '100%', height: 'auto', minHeight: 44, boxSizing: 'border-box',
          padding: '8px 12px', fontSize: fs(17), fontFamily: 'var(--font-sans)',
          textAlign: 'start', color: sidebar ? 'inherit' : 'var(--dw-text-primary)',
          background: 'transparent', border: '1px solid var(--dw-border)', borderRadius: 12,
          cursor: 'pointer', whiteSpace: 'normal', overflowWrap: 'anywhere',
        }}
      >
        {currentLabel}
      </button>
      {loadError && <p role="alert" style={{ margin: '8px 0', fontSize: fs(15) }}>{t('staff_text_size_load_error', lang)}</p>}
      <p className={!status ? 'sr-only' : undefined} role="status" aria-live="polite" style={{ margin: status ? '8px 0' : 0, fontSize: fs(15) }}>
        {status === 'loading' ? t('staff_text_size_loading', lang)
          : status ? t('staff_text_size_saved_status', lang).replace('{percent}', status.saved) : null}
      </p>
      <style>{`.staff-text-size-dialog::backdrop { background: rgb(0 0 0 / 0.3); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }`}</style>
      <dialog
        ref={dialog} aria-labelledby={titleId} className="staff-text-size-dialog"
        style={{
          position: 'fixed', inset: 0, margin: 'auto', boxSizing: 'border-box',
          maxHeight: 'calc(100dvh - 32px)', width: 'calc(100% - 32px)', maxWidth: 448,
          overflowY: 'auto', borderRadius: 16, border: '1px solid var(--dw-border)',
          background: 'var(--dw-card)', padding: 16, color: 'var(--dw-text-primary)',
          fontFamily: 'var(--font-sans)', boxShadow: '0 12px 32px rgb(0 0 0 / 0.14)',
          '--mo-ink': 'var(--dw-text-primary)', '--mo-muted': 'var(--dw-text-primary)',
          '--mo-bg': 'var(--dw-card)', '--mo-card': 'var(--dw-card)',
          '--mo-line': 'var(--dw-border)', '--mo-font': 'var(--font-sans)',
          '--mo-accent': 'var(--dw-accent)', '--mo-btn-fill': 'var(--dw-accent)',
          '--mo-btn-ink': 'var(--mos-on-primary)',
        } as CSSProperties}
        onClose={() => changeButton.current?.focus()}
        onCancel={() => setStatus(null)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
            setStatus(null);
            event.currentTarget.close();
          }
        }}
      >
        <h2 id={titleId} style={{ margin: '0 0 12px', fontSize: fs(21) }}>{t('staff_text_size', lang)}</h2>
        {/* The vendored picker reverts an unsaved preview on dialog cancel/close. */}
        <mos-text-size ref={picker} heading="off" lang={lang} labels={labels} />
      </dialog>
    </div>
  );
}
