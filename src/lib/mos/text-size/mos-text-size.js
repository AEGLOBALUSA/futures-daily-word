/* Load after MOS_TEXT_SCRIPT in <head>; no bundle or framework required. */
(function () {
  'use strict';
  if (customElements.get('mos-text-size')) return;

  let warned = false;
  let previewOwner = null;
  const english = {
    title: 'Text size', sample: 'This is how your writing will look.', save: 'Save', cancel: 'Cancel',
    default: 'Default', hint: 'Tap Save to keep this size.', saved: 'Text size saved'
  };
  const hints = {
    es: 'Toca Guardar para mantener este tamaño.',
    id: 'Ketuk Simpan untuk menyimpan ukuran ini.'
  };
  const savedLabels = {
    es: 'Tamaño del texto guardado',
    id: 'Ukuran teks disimpan'
  };

  class MOSTextSize extends HTMLElement {
    static get observedAttributes() { return ['labels', 'heading', 'lang']; }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._rows = [];
      this._onChange = () => this._sync();
      this._onViewportChange = () => this._fit();
      this._onLeave = () => {
        if (previewOwner !== this) return;
        previewOwner = null;
        if (window.MOSText && window.MOSText.previewing()) window.MOSText.revert();
      };
      this._onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') this._onLeave();
      };
    }

    connectedCallback() {
      this._render();
      window.addEventListener('mos-text-change', this._onChange);
      window.addEventListener('pagehide', this._onLeave);
      window.addEventListener('popstate', this._onLeave);
      document.addEventListener('visibilitychange', this._onVisibilityChange);
      window.addEventListener('resize', this._onViewportChange);
      window.addEventListener('scroll', this._onViewportChange, true);
      if (window.visualViewport) window.visualViewport.addEventListener('resize', this._onViewportChange);
      // A settings dialog may stay mounted, including outside our enclosing shadow root.
      let ancestor = this.parentNode;
      while (ancestor && ancestor.localName !== 'dialog') ancestor = ancestor.parentNode || ancestor.host;
      this._dialog = ancestor || null;
      if (this._dialog) {
        this._dialog.addEventListener('cancel', this._onLeave);
        this._dialog.addEventListener('close', this._onLeave);
        this._dialogObserver = new MutationObserver(() => {
          if (!this._dialog.open) this._onLeave();
          this._scheduleLayout();
        });
        this._dialogObserver.observe(this._dialog, { attributes: true, attributeFilter: ['open'] });
      }
      this._resizeObserver = new ResizeObserver(() => this._scheduleLayout());
      this._resizeObserver.observe(this);
    }

    disconnectedCallback() {
      window.removeEventListener('mos-text-change', this._onChange);
      window.removeEventListener('pagehide', this._onLeave);
      window.removeEventListener('popstate', this._onLeave);
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      window.removeEventListener('resize', this._onViewportChange);
      window.removeEventListener('scroll', this._onViewportChange, true);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', this._onViewportChange);
      if (this._dialog) {
        this._dialog.removeEventListener('cancel', this._onLeave);
        this._dialog.removeEventListener('close', this._onLeave);
        this._dialog = null;
      }
      if (this._dialogObserver) this._dialogObserver.disconnect();
      if (this._resizeObserver) this._resizeObserver.disconnect();
      window.cancelAnimationFrame(this._layoutFrame);
      this._onLeave();
    }

    attributeChangedCallback() {
      if (this.isConnected) this._render();
    }

    _words() {
      let supplied;
      try { supplied = JSON.parse(this.getAttribute('labels') || '{}'); }
      catch (error) { supplied = null; }
      const words = Object.assign({}, english);
      const language = (this.lang || document.documentElement.lang || 'en').toLowerCase().split('-')[0];
      words.hint = hints[language] || english.hint;
      words.saved = savedLabels[language] || english.saved;
      if (supplied && typeof supplied === 'object' && !Array.isArray(supplied)) {
        Object.keys(english).forEach(key => {
          if (typeof supplied[key] === 'string') words[key] = supplied[key];
        });
      }
      return words;
    }

    _render() {
      const focused = this.shadowRoot.activeElement;
      const focusedKey = focused && focused.getAttribute('data-key');
      const focusedAction = focused && focused.getAttribute('data-action');
      this.shadowRoot.textContent = '';
      this._rows = [];
      if (!window.MOSText) {
        if (!warned) {
          console.warn('<mos-text-size>: missing MOS_TEXT_SCRIPT pre-paint script in <head> (window.MOSText).');
          warned = true;
        }
        return;
      }

      const style = document.createElement('style');
      style.textContent = `
        :host { display: flex; flex-direction: column; min-width: 0; min-height: 0; max-width: 100%; max-height: 100%; color: var(--mo-ink, #111);
          font-family: var(--mo-font, system-ui), sans-serif; }
        :host([hidden]) { display: none; }
        * { box-sizing: border-box; }
        .picker { display: flex; flex-direction: column; min-width: 0; min-height: 0;
          max-height: calc(100vh - 32px); background: var(--mo-bg, var(--mo-card, #fff)); }
        .body { min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
        h2 { margin: 0 0 8px; font-size: calc(21px * var(--mos-ts, 1));
          line-height: 1.25; font-weight: 700; overflow-wrap: anywhere; }
        h2[hidden] { display: none; }
        .sample { margin: 0 0 16px; color: var(--mo-muted, #6B6B6B);
          font-size: calc(17px * var(--mos-ts, 1));
          line-height: 1.45; overflow-wrap: anywhere; }
        .choices { border: 1px solid var(--mo-line, #E6E6E6); border-radius: 16px; }
        button { font: inherit; cursor: pointer; }
        .choices button { display: grid; grid-template-columns: 48px minmax(0, 1fr) 24px;
          align-items: center; gap: 12px; width: 100%; min-height: 52px;
          padding: 12px 16px; border: 0; border-bottom: 1px solid var(--mo-line, #E6E6E6);
          background: transparent; color: var(--mo-ink, #111); font: inherit;
          font-size: calc(17px * var(--mos-ts, 1));
          line-height: 1.35; text-align: start; cursor: pointer; }
        .choices button:first-child { border-radius: 15px 15px 0 0; }
        .choices button:last-child { border-bottom: 0; border-radius: 0 0 15px 15px; }
        button:focus-visible { outline: 2px solid var(--mo-accent, #0A84FF); outline-offset: -3px; }
        .preview { line-height: 1.2; font-weight: 400; white-space: nowrap; }
        .label { min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
        .default-label { display: block; font-size: calc(15px * var(--mos-ts, 1)); font-weight: 400; }
        .tick { width: 24px; height: 24px; visibility: hidden; color: var(--mo-accent, #0A84FF); }
        [aria-checked="true"] .tick { visibility: visible; }
        .actions { position: sticky; bottom: 0; flex-shrink: 0; display: flex; align-items: center;
          flex-wrap: wrap; gap: 12px; padding: 12px 8px max(8px, env(safe-area-inset-bottom, 0px));
          background: var(--mo-card, #fff); }
        .actions button { min-width: 44px; min-height: 44px; max-width: 100%; padding: 12px 16px; border: 0;
          border-radius: 999px; font-size: calc(17px * var(--mos-ts, 1));
          line-height: 1.35; font-weight: 600; overflow-wrap: anywhere; }
        .actions .save { position: relative; flex: 1; min-height: 56px; background: var(--mo-btn-fill, #111);
          color: var(--mo-btn-ink, #fff); }
        .save:focus, .save:focus-visible { outline-offset: 2px; }
        .save[data-previewing]::after { content: ''; position: absolute; inset: -6px; border-radius: inherit;
          border: 2px solid var(--mo-accent, #0A84FF); pointer-events: none; }
        @media (prefers-reduced-motion: no-preference) {
          .save[data-previewing]::after { animation: save-ring 1.8s ease-in-out infinite; }
        }
        @keyframes save-ring { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .hint, .saved { flex-basis: 100%; margin: 0; color: var(--mo-ink, #111);
          font-size: calc(15px * var(--mos-ts, 1)); line-height: 1.4; overflow-wrap: anywhere; }
        .saved:empty { display: contents; }
        .cancel { background: transparent; color: var(--mo-ink, #111); }
        @media (max-width: 768px) {
          .actions { flex-wrap: wrap; }
          .actions .save { flex-basis: 100%; width: 100%; }
          .cancel { margin-inline: auto; }
        }
      `;
      this.shadowRoot.appendChild(style);
      const words = this._words();
      const picker = document.createElement('section');
      picker.className = 'picker';
      const body = document.createElement('div');
      body.className = 'body';
      const title = document.createElement('h2');
      title.textContent = words.title;
      title.hidden = this.getAttribute('heading') === 'off';
      body.appendChild(title);
      const sample = document.createElement('p');
      sample.className = 'sample';
      sample.textContent = words.sample;
      body.appendChild(sample);
      const choices = document.createElement('div');
      choices.className = 'choices';
      choices.setAttribute('role', 'radiogroup');
      choices.setAttribute('aria-label', words.title || english.title);
      choices.setAttribute('aria-orientation', 'vertical');

      window.MOSText.steps.forEach(step => {
        const row = document.createElement('button');
        row.type = 'button';
        row.setAttribute('role', 'radio');
        row.setAttribute('data-key', step.key);
        row.setAttribute('aria-label', step.key === 'default' ? step.label + ', ' + words.default : step.label);
        const preview = document.createElement('span');
        preview.className = 'preview';
        preview.setAttribute('aria-hidden', 'true');
        // Round 17 x scale to half pixels, independently of the current choice.
        preview.style.fontSize = (Math.round(17 * step.scale * 2) / 2) + 'px';
        preview.textContent = 'Aa';
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = step.label;
        if (step.key === 'default') {
          const defaultLabel = document.createElement('span');
          defaultLabel.className = 'default-label';
          defaultLabel.textContent = words.default;
          label.appendChild(defaultLabel);
        }
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tick.setAttribute('class', 'tick');
        tick.setAttribute('viewBox', '0 0 24 24');
        tick.setAttribute('aria-hidden', 'true');
        tick.setAttribute('focusable', 'false');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M5 12l4 4L19 6');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        tick.appendChild(path);
        row.appendChild(preview);
        row.appendChild(label);
        row.appendChild(tick);
        row.addEventListener('click', () => this._pick(step.key));
        row.addEventListener('keydown', event => this._key(event, row));
        this._rows.push(row);
        choices.appendChild(row);
      });
      body.appendChild(choices);
      picker.appendChild(body);
      const actions = document.createElement('div');
      actions.className = 'actions';
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'save';
      save.setAttribute('data-action', 'save');
      save.textContent = words.save;
      save.addEventListener('click', () => {
        previewOwner = null;
        const value = window.MOSText.save();
        if (!value) return;
        this._saved = true;
        this._sync();
        this.dispatchEvent(new CustomEvent('change', {
          bubbles: true, composed: true, detail: { size: value.size, at: value.at }
        }));
      });
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'cancel';
      cancel.setAttribute('data-action', 'cancel');
      cancel.textContent = words.cancel;
      cancel.addEventListener('click', () => {
        this._onLeave();
        this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
      });
      actions.appendChild(save);
      actions.appendChild(cancel);
      const saved = document.createElement('p');
      saved.className = 'saved';
      saved.setAttribute('role', 'status');
      saved.setAttribute('aria-live', 'polite');
      actions.appendChild(saved);
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.id = 'save-hint';
      hint.textContent = words.hint;
      hint.hidden = true;
      actions.appendChild(hint);
      picker.appendChild(actions);
      this.shadowRoot.appendChild(picker);
      this._sync();
      const replacement = focusedAction === 'save' ? save : focusedAction === 'cancel' ? cancel
        : this._rows.find(row => row.getAttribute('data-key') === focusedKey);
      if (replacement) replacement.focus();
    }

    _fit() {
      if (!this.getClientRects().length) {
        this._onLeave();
        return;
      }
      const picker = this.shadowRoot.querySelector('.picker');
      if (!picker) return;
      const viewport = window.visualViewport;
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      // Leave the footer visible even when content above the picker grows during preview.
      const available = bottom - Math.max(0, this.getBoundingClientRect().top) - 16;
      picker.style.maxHeight = Math.max(0, available) + 'px';
    }

    _sync() {
      if (!window.MOSText) return;
      const size = window.MOSText.shown();
      this._rows.forEach(row => {
        const checked = row.getAttribute('data-key') === size;
        row.setAttribute('aria-checked', String(checked));
        row.tabIndex = checked ? 0 : -1;
      });
      const previewing = window.MOSText.previewing();
      if (previewing) this._saved = false;
      const saved = this.shadowRoot.querySelector('.saved');
      if (saved) saved.textContent = this._saved ? this._words().saved : '';
      const save = this.shadowRoot.querySelector('.save');
      const hint = this.shadowRoot.querySelector('.hint');
      if (save) {
        save.toggleAttribute('data-previewing', previewing);
        if (previewing) save.setAttribute('aria-describedby', 'save-hint');
        else save.removeAttribute('aria-describedby');
      }
      if (hint) hint.hidden = !previewing;
      this._fit();
      this._scheduleLayout();
    }

    _scheduleLayout() {
      window.cancelAnimationFrame(this._layoutFrame);
      this._layoutFrame = window.requestAnimationFrame(() => {
        if (!this.isConnected) return;
        if (!this.getClientRects().length) {
          this._onLeave();
          return;
        }
        this._fit();
        const body = this.shadowRoot.querySelector('.body');
        const checked = this._rows.find(row => row.getAttribute('aria-checked') === 'true');
        if (!body || !checked || !body.clientHeight) return;
        // Scroll only the choices body, keeping the Save footer and outer page in place.
        const bounds = body.getBoundingClientRect();
        const row = checked.getBoundingClientRect();
        if (row.top < bounds.top) body.scrollTop += row.top - bounds.top;
        else if (row.bottom > bounds.bottom) body.scrollTop += row.bottom - bounds.bottom;
      });
    }

    _pick(key) {
      if (!window.MOSText) return;
      if (!window.MOSText.preview(key)) return;
      previewOwner = this;
      this._sync();
    }

    _key(event, row) {
      let index = this._rows.indexOf(row);
      switch (event.key) {
        case 'ArrowUp': case 'ArrowLeft': index--; break;
        case 'ArrowDown': case 'ArrowRight': index++; break;
        case 'Home': index = 0; break;
        case 'End': index = this._rows.length - 1; break;
        case ' ': case 'Enter': break;
        default: return;
      }
      event.preventDefault();
      const next = this._rows[(index + this._rows.length) % this._rows.length];
      next.focus();
      this._pick(next.getAttribute('data-key'));
    }
  }

  customElements.define('mos-text-size', MOSTextSize);
})();
