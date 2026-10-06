/* MultiplyOS Guide: words in, one contextual next step out. Classic script; no dependencies.
   mos-text-ignore-file: the panel sizes its own text in rem with a 15px phone floor. */
(function () {
  'use strict';
  try {
    var defaults = {
      open: 'Guide', close: 'Close guide', title: 'Guide', onThisScreen: 'On this screen',
      why: 'Why {app} exists', who: "Who it's for", howTo: 'How to use it', parts: 'Every part',
      connects: 'How this connects', back: 'Back', map: 'How MultiplyOS fits together',
      full: 'Full guide', goThere: 'Go there'
    };

    function guideLabels(content) {
      var labels = {};
      Object.keys(defaults).forEach(function (key) {
        var custom = content.labels && content.labels[key];
        labels[key] = (typeof custom === 'string' ? custom : defaults[key])
          .split('{app}').join(content.app || '');
      });
      return labels;
    }

    function matchPart(parts, pathname, slug) {
      var explicit = slug && parts.find(function (part) { return part.slug === slug; });
      if (explicit) return explicit;
      var winner = null, length = -1;
      parts.forEach(function (part) {
        (part.routes || []).forEach(function (route) {
          if (typeof route !== 'string' || !route.startsWith('/')) return;
          var matches = route === '/' ? pathname === '/' : (pathname === route || pathname.startsWith(route.endsWith('/') ? route : route + '/'));
          if (matches && route.length > length) { winner = part; length = route.length; }
        });
      });
      return winner;
    }

    function safeHref(href) {
      if (typeof href !== 'string' || /[\s\\\u0000-\u001f\u007f]/.test(href)) return null;
      if (/^\/(?!\/)/.test(href)) return href;
      if (!/^https:\/\//i.test(href)) return null;
      try { return new URL(href).protocol === 'https:' ? href : null; } catch (_) { return null; }
    }

    function connectionAction(connection, parts) {
      var part = connection && connection.slug && parts.find(function (candidate) {
        return candidate.slug === connection.slug;
      });
      if (part) return { type: 'part', slug: part.slug };
      var href = safeHref(connection && connection.href);
      if (href) return { type: 'link', href: href };
      return { type: 'text' };
    }

    // A small AST, never HTML. Even apparent tags remain ordinary text nodes.
    function inline(text) {
      var tokens = [], cursor = 0;
      var pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:[^()]|\([^()]*\))*)\)/g;
      var match;
      while ((match = pattern.exec(text))) {
        if (match.index > cursor) tokens.push({ type: 'text', text: text.slice(cursor, match.index) });
        if (match[1] !== undefined) tokens.push({ type: 'strong', children: inline(match[1]) });
        else if (safeHref(match[3])) tokens.push({ type: 'link', href: match[3], children: inline(match[2]) });
        else tokens.push({ type: 'text', text: match[0] });
        cursor = pattern.lastIndex;
      }
      if (cursor < text.length) tokens.push({ type: 'text', text: text.slice(cursor) });
      return tokens;
    }

    function parseMarkdown(value) {
      var blocks = [], paragraph = [], list = null;
      function flush() {
        if (paragraph.length) blocks.push({ type: 'paragraph', children: inline(paragraph.join(' ')) });
        paragraph = [];
        list = null;
      }
      String(value || '').replace(/\r\n?/g, '\n').split('\n').forEach(function (line) {
        var item = /^\s*(?:(-) |(\d+)\. )(.*)$/.exec(line);
        if (!line.trim()) { flush(); return; }
        if (item) {
          var type = item[1] ? 'ul' : 'ol';
          if (!list || list.type !== type) { flush(); list = { type: type, items: [] }; blocks.push(list); }
          list.items.push(inline(item[3]));
        } else { list = null; paragraph.push(line.trim()); }
      });
      flush();
      return blocks;
    }

    // Guarded CommonJS exports keep this file valid as a classic deferred script.
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { matchPart: matchPart, parseMarkdown: parseMarkdown, guideLabels: guideLabels, safeHref: safeHref, connectionAction: connectionAction };
    }
    if (typeof window === 'undefined' || typeof document === 'undefined' || window.moGuide) return;

    var content = null, labels, root, panel, header, body, actionArea, actionSlot;
    var opened = false, opener = null, openerSlug = null, detailSlug = null;
    var trail = [], expanded = new Set(), overflow = [], inertHost = null;
    var pushed = false, entryUrl = null, entryLength = 0, closing = false;
    var pendingHref = null, navigationTimer = null;
    var phone = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
    var css = `
.mo-guide-root {
  --mo-guide-ground: var(--mos-surface, var(--mo-card, #fff));
  --mo-guide-text: var(--mos-text, var(--mo-ink, #0B1320));
  --mo-guide-muted: var(--mos-muted, var(--mo-muted, #5B6472));
  --mo-guide-line: var(--mos-border, var(--mo-line, #E3E6EA));
  --mo-guide-link: var(--mos-info, var(--mo-accent, #1F4FD8));
  --mo-guide-focus: var(--mos-focus, var(--mo-accent, #1F4FD8));
  --mo-guide-fill: var(--mos-primary, var(--mo-btn-fill, #0B1320));
  --mo-guide-on-fill: var(--mos-on-primary, var(--mo-btn-ink, #fff));
  --mo-guide-button-edge: transparent;
  position: fixed; inset: 0; z-index: 2147482900; isolation: isolate;
  color: var(--mo-guide-text); font-family: inherit; font-size: 1rem; line-height: 1.55;
}
.mo-guide-root[hidden], .mo-guide-root [hidden] { display: none !important; }
.mo-guide-root *, .mo-guide-root *::before, .mo-guide-root *::after { box-sizing: border-box; }
.mo-guide-root :where(p, ul, ol, li, button, a, span, strong, h1, h2, h3) {
  font-family: inherit; font-size: inherit; letter-spacing: normal; text-transform: none;
}
.mo-guide-dim { position: absolute; inset: 0; background: rgba(11,19,32,.32);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.mo-guide-panel {
  position: absolute; inset: 0 0 0 auto; width: min(440px, 100vw); height: 100vh; height: 100dvh;
  display: flex; flex-direction: column; min-width: 0; overflow: hidden;
  background: var(--mo-guide-ground); color: var(--mo-guide-text); border-left: 1px solid var(--mo-guide-line);
  box-shadow: 0 12px 32px rgb(0 0 0 / .14);
  animation: mo-guide-enter 200ms ease-out;
}
.mo-guide-grab { display: none; }
.mo-guide-header { flex: none; display: flex; align-items: center; gap: 1rem; padding: 1.25rem;
  padding-top: max(1.25rem, env(safe-area-inset-top)); border-bottom: 1px solid var(--mo-guide-line); }
.mo-guide-heading-wrap { flex: 1; min-width: 0; }
.mo-guide-app { margin: 0; color: var(--mo-guide-muted); font-size: .875rem; }
.mo-guide-title { margin: 0; font-size: 1.75rem; line-height: 1.2; font-weight: 700; }
.mo-guide-body { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain;
  padding: 1.25rem; padding-bottom: calc(1.25rem + env(safe-area-inset-bottom)); }
.mo-guide-section { margin: 0 0 1.75rem; min-width: 0; }
.mo-guide-section + .mo-guide-section { padding-top: 1.5rem; border-top: 1px solid var(--mo-guide-line); }
.mo-guide-heading { margin: 0 0 .75rem; font-size: 1.3125rem; line-height: 1.3; font-weight: 700; }
.mo-guide-subheading { margin: 1rem 0 .5rem; font-size: 1.0625rem; line-height: 1.4; font-weight: 600; }
.mo-guide-context { margin: 0 0 .5rem; color: var(--mo-guide-muted); font-weight: 600; }
.mo-guide-text { margin: 0 0 .875rem; }
.mo-guide-muted { color: var(--mo-guide-muted); }
.mo-guide-list { margin: .5rem 0 1rem; padding-left: 1.5rem; }
.mo-guide-item { margin: .375rem 0; padding-left: .125rem; }
.mo-guide-strong { font-weight: 600; }
.mo-guide-root :is(p, h1, h2, h3, a, button, li, span) { overflow-wrap: anywhere; }
.mo-guide-root :is(.mo-guide-button, .mo-guide-link, .mo-guide-next) {
  margin: 0; text-transform: none; letter-spacing: normal; box-shadow: none; width: auto;
  max-width: 100%; height: auto; font: inherit; }
.mo-guide-root .mo-guide-link { display: inline-flex; align-items: center; min-height: 44px;
  color: var(--mo-guide-link); text-decoration: underline; text-underline-offset: .18em; }
.mo-guide-root .mo-guide-button { appearance: none; font: inherit; font-weight: 600; color: var(--mo-guide-text);
  background: transparent; border: 0; border-radius: 10px; cursor: pointer; min-height: 44px; padding: .5rem .75rem; }
.mo-guide-root .mo-guide-quiet { display: inline-flex; align-items: center; min-height: 44px; padding: .5rem 0; }
.mo-guide-root .mo-guide-connect { line-height: 1.55; padding-top: 0; padding-bottom: 0; vertical-align: baseline; }
.mo-guide-root .mo-guide-close { flex: none; display: inline-flex; align-items: center; gap: .375rem; min-width: 44px; min-height: 44px; padding: .5rem; }
.mo-guide-icon { display: block; flex: none; width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.8; }
.mo-guide-root .mo-guide-row { display: flex; align-items: center; justify-content: space-between; gap: .75rem; width: 100%;
  text-align: left; padding: .875rem 0; border-radius: 0; border-bottom: 1px solid var(--mo-guide-line); }
.mo-guide-row-copy { min-width: 0; }
.mo-guide-row-title { display: block; font-weight: 600; }
.mo-guide-row-intro { display: block; color: var(--mo-guide-muted); font-weight: 400; }
.mo-guide-chevron { flex: none; width: 20px; height: 20px; }
.mo-guide-row[aria-expanded="true"] .mo-guide-chevron { transform: rotate(90deg); }
.mo-guide-root .mo-guide-next { display: inline-flex; justify-content: center; align-items: center; min-height: 44px;
  padding: .625rem 1rem; border: 1px solid var(--mo-guide-button-edge); border-radius: 10px; font-weight: 600; text-decoration: none;
  background: var(--mo-guide-fill); color: var(--mo-guide-on-fill); }
.mo-guide-root .mo-guide-back { margin: 0 0 1rem; padding-left: 0; color: var(--mo-guide-link); }
.mo-guide-footer { display: flex; flex-direction: column; align-items: flex-start; gap: .25rem;
  padding-top: 1rem; border-top: 1px solid var(--mo-guide-line); }
.mo-guide-root :focus-visible { outline: 2px solid var(--mo-guide-focus); outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--mo-guide-ground); }
@keyframes mo-guide-enter { from { transform: translateX(100%); } to { transform: translateX(0); } }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .mo-guide-root {
    --mo-guide-ground: var(--mos-surface, var(--mo-card, #111418));
    --mo-guide-text: var(--mos-text, var(--mo-ink, #F5F6F7));
    --mo-guide-muted: var(--mos-muted, var(--mo-muted, #A9B0BA));
    --mo-guide-line: var(--mos-border, var(--mo-line, #2A2F36));
    /* Fallback WCAG ratios: links/focus on #111418 = 7.56:1 (text >=4.5, edge >=3). */
    --mo-guide-link: var(--mos-info, var(--mo-accent, #7BA4FF));
    --mo-guide-focus: var(--mos-focus, var(--mo-accent, #7BA4FF));
    /* #0B1320 on #F5F6F7 = 17.20:1 (text >=4.5). */
    --mo-guide-fill: var(--mos-primary, var(--mo-btn-fill, #F5F6F7));
    --mo-guide-on-fill: var(--mos-on-primary, var(--mo-btn-ink, #0B1320));
    /* #F5F6F7 against #111418 = 17.07:1 (edge >=3). */
    --mo-guide-button-edge: var(--mos-text, var(--mo-ink, #F5F6F7));
  }
}
:root[data-theme="dark"] .mo-guide-root {
  --mo-guide-ground: var(--mos-surface, var(--mo-card, #111418));
  --mo-guide-text: var(--mos-text, var(--mo-ink, #F5F6F7));
  --mo-guide-muted: var(--mos-muted, var(--mo-muted, #A9B0BA));
  --mo-guide-line: var(--mos-border, var(--mo-line, #2A2F36));
  /* Fallback WCAG ratios: links/focus on #111418 = 7.56:1 (text >=4.5, edge >=3). */
  --mo-guide-link: var(--mos-info, var(--mo-accent, #7BA4FF));
  --mo-guide-focus: var(--mos-focus, var(--mo-accent, #7BA4FF));
  /* #0B1320 on #F5F6F7 = 17.20:1 (text >=4.5). */
  --mo-guide-fill: var(--mos-primary, var(--mo-btn-fill, #F5F6F7));
  --mo-guide-on-fill: var(--mos-on-primary, var(--mo-btn-ink, #0B1320));
  /* #F5F6F7 against #111418 = 17.07:1 (edge >=3). */
  --mo-guide-button-edge: var(--mos-text, var(--mo-ink, #F5F6F7));
}
@media (max-width: 768px) {
  .mo-guide-root { font-size: max(15px, 1rem); }
  .mo-guide-app { font-size: max(15px, 1rem); }
  .mo-guide-title { font-size: max(15px, 1.75rem); }
  .mo-guide-heading { font-size: max(15px, 1.3125rem); }
  .mo-guide-subheading { font-size: max(15px, 1.0625rem); }
  .mo-guide-panel { inset: auto 0 0; width: 100%; height: 92vh; height: 92dvh;
    border-left: 0; border-top: 1px solid var(--mo-guide-line); border-radius: 20px 20px 0 0;
    animation-name: mo-guide-rise; }
  .mo-guide-grab { display: block; flex: none; width: 36px; height: 4px; border-radius: 4px;
    margin: 8px auto 0; background: var(--mo-guide-line); }
  .mo-guide-header { padding: 1rem; }
  .mo-guide-body { padding: 1rem; padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }
  .mo-guide-action { position: sticky; bottom: 0; flex: none; padding: 1rem;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom)); border-top: 1px solid var(--mo-guide-line);
    background: var(--mo-guide-ground); }
  .mo-guide-root .mo-guide-next { min-height: 56px; width: 100%; }
  @keyframes mo-guide-rise { from { transform: translateY(100%); } to { transform: translateY(0); } }
}
@media (pointer: coarse) { .mo-guide-root .mo-guide-button, .mo-guide-root .mo-guide-quiet { min-height: 48px; } }
@media (prefers-reduced-motion: reduce) { .mo-guide-panel { animation: none; } }
@media print { .mo-guide-root { display: none !important; } }
`;

    function element(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = 'mo-guide-' + className;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function protect(fn) {
      return function () {
        try { return fn.apply(null, arguments); }
        catch (_) { try { close(); } catch (ignored) {} }
      };
    }
    function listen(node, event, fn) { node.addEventListener(event, protect(fn)); }
    function button(text, key, fn) {
      var node = element('button', 'button', text);
      node.type = 'button'; node.dataset.moGuideKey = key;
      listen(node, 'click', fn);
      return node;
    }
    function icon(closeIcon) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false'); svg.setAttribute('class', 'mo-guide-icon' + (closeIcon ? '' : ' mo-guide-chevron'));
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', closeIcon ? 'M6 6l12 12M18 6L6 18' : 'm9 5 7 7-7 7');
      svg.appendChild(path); return svg;
    }
    function link(text, href, className) {
      var valid = safeHref(href), node = element(valid ? 'a' : 'span', className || 'link', text);
      if (valid) {
        node.setAttribute('href', valid);
        listen(node, 'click', function (event) {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (event.button !== undefined && event.button !== 0)) return;
          event.preventDefault();
          if (pendingHref || lockAbove()) return;
          pendingHref = valid;
          navigationTimer = setTimeout(finishNavigation, 400);
          close();
        });
      }
      return node;
    }
    function renderInline(parent, tokens) {
      tokens.forEach(function (token) {
        if (token.type === 'text') parent.appendChild(document.createTextNode(token.text));
        else {
          var node = token.type === 'strong' ? element('strong', 'strong') : link('', token.href);
          renderInline(node, token.children); parent.appendChild(node);
        }
      });
    }
    function markdown(parent, text) {
      parseMarkdown(text).forEach(function (block) {
        var node = element(block.type === 'paragraph' ? 'p' : block.type, block.type === 'paragraph' ? 'text' : 'list');
        if (block.children) renderInline(node, block.children);
        else block.items.forEach(function (tokens) { var li = element('li', 'item'); renderInline(li, tokens); node.appendChild(li); });
        parent.appendChild(node);
      });
    }
    function steps(parent, items) {
      if (!items || !items.length) return;
      var list = element('ol', 'list');
      items.forEach(function (text) { var li = element('li', 'item'); renderInline(li, inline(text)); list.appendChild(li); });
      parent.appendChild(list);
    }
    function section(title) {
      var node = element('section', 'section'); node.appendChild(element('h2', 'heading', title)); return node;
    }
    function partSection(part, contextual) {
      var node = element('section', 'section');
      if (contextual) node.appendChild(element('p', 'context', labels.onThisScreen));
      var heading = element('h2', 'heading', part.title);
      heading.tabIndex = -1; heading.dataset.moGuideKey = 'detail-heading';
      node.appendChild(heading);
      node.appendChild(element('p', 'text', part.intro));
      markdown(node, part.body); steps(node, part.steps);
      if (part.connects && part.connects.length) {
        node.appendChild(element('h3', 'subheading', labels.connects));
        var list = element('ul', 'list');
        part.connects.forEach(function (connection, index) {
          var li = element('li', 'item'), title = element('strong', 'strong', connection.title);
          var action = connectionAction(connection, content.parts);
          if (action.type === 'part') {
            var key = 'connect:' + part.slug + ':' + index;
            var partButton = button('', key, function () { showPart(action.slug, key); });
            partButton.classList.add('mo-guide-quiet', 'mo-guide-connect'); partButton.appendChild(title); li.appendChild(partButton);
          } else if (action.type === 'link') {
            var a = link('', action.href, 'link mo-guide-quiet mo-guide-connect'); a.appendChild(title); li.appendChild(a);
          } else li.appendChild(title);
          li.appendChild(document.createTextNode(' — ' + connection.how)); list.appendChild(li);
        });
        node.appendChild(list);
      }
      if (part.next) {
        actionSlot = element('div', 'action-slot');
        var next = link(part.next.label, part.next.href, safeHref(part.next.href) ? 'next' : 'text');
        next.dataset.moGuideKey = 'next'; actionArea.appendChild(next);
        actionArea.hidden = false; actionSlot.appendChild(actionArea); node.appendChild(actionSlot);
      }
      return node;
    }
    function focusKey(key) {
      if (lockAbove()) return;
      var target = Array.from(panel.querySelectorAll('[data-mo-guide-key]')).find(function (node) { return node.dataset.moGuideKey === key; });
      (target || panel).focus({ preventScroll: true });
    }
    function showPart(slug, key) {
      trail.push({ slug: detailSlug, scroll: body.scrollTop, key: key }); detailSlug = slug;
      render(); body.scrollTop = 0; focusKey('detail-heading');
    }
    function back() {
      var previous = trail.pop();
      detailSlug = previous ? previous.slug : null; render();
      body.scrollTop = previous ? previous.scroll : 0; focusKey(previous && previous.key);
    }
    function placeAction() {
      if (!actionSlot) return;
      var active = document.activeElement, refocus = actionArea.contains(active);
      (phone && phone.matches ? panel : actionSlot).appendChild(actionArea);
      if (refocus && !lockAbove()) active.focus({ preventScroll: true });
    }
    function render() {
      labels = guideLabels(content);
      panel.lang = content.lang || document.documentElement.lang || 'en';
      header.replaceChildren(); body.replaceChildren();
      actionArea.replaceChildren(); actionArea.hidden = true; actionSlot = null;
      var wrap = element('div', 'heading-wrap');
      wrap.appendChild(element('p', 'app', content.app));
      var title = element('h1', 'title', labels.title); title.id = 'mo-guide-title'; wrap.appendChild(title);
      var dismiss = button('', 'close', close); dismiss.classList.add('mo-guide-close');
      dismiss.setAttribute('aria-label', labels.close); dismiss.append(icon(true), element('span', '', labels.close));
      header.append(wrap, dismiss);
      var detail = detailSlug && content.parts.find(function (part) { return part.slug === detailSlug; });
      if (detail) {
        var backButton = button(labels.back, 'back', back); backButton.classList.add('mo-guide-back');
        body.append(backButton, partSection(detail, false));
      } else {
        detailSlug = null;
        var contextual = matchPart(content.parts, location.pathname, openerSlug);
        if (contextual) body.appendChild(partSection(contextual, true));
        var why = section(labels.why); markdown(why, content.why.body);
        var who = element('p', 'text'); who.appendChild(element('strong', 'strong', labels.who + ': '));
        who.appendChild(document.createTextNode(content.why.who)); why.appendChild(who); body.appendChild(why);
        var how = section(labels.howTo);
        content.howTo.forEach(function (job, index) {
          var jobBody = element('div', 'job'); jobBody.id = 'mo-guide-job-' + index;
          jobBody.hidden = !expanded.has(index); steps(jobBody, job.steps);
          if (job.href) jobBody.appendChild(link(labels.goThere, job.href, 'link mo-guide-quiet'));
          var row = button(job.title, 'job:' + index, function () {
            if (expanded.has(index)) expanded.delete(index); else expanded.add(index);
            jobBody.hidden = !expanded.has(index); row.setAttribute('aria-expanded', String(!jobBody.hidden));
          });
          row.classList.add('mo-guide-row'); row.setAttribute('aria-expanded', String(!jobBody.hidden));
          row.setAttribute('aria-controls', jobBody.id); row.appendChild(icon(false)); how.append(row, jobBody);
        });
        body.appendChild(how);
        var parts = section(labels.parts);
        content.parts.forEach(function (part) {
          var row = button('', 'part:' + part.slug, function () { showPart(part.slug, 'part:' + part.slug); }); row.classList.add('mo-guide-row');
          var copy = element('span', 'row-copy'); copy.append(element('span', 'row-title', part.title), element('span', 'row-intro', part.intro));
          row.append(copy, icon(false)); parts.appendChild(row);
        });
        body.appendChild(parts);
      }
      var footer = element('footer', 'footer');
      if (content.fullGuide) footer.appendChild(link(content.fullGuide.label || labels.full, content.fullGuide.href, 'link mo-guide-quiet'));
      var mapHref = content.mapHref === undefined ? 'https://app.futures.church/#guide' : content.mapHref;
      if (safeHref(mapHref)) {
        var target = new URL(mapHref, location.href), current = new URL(location.href);
        // Ignore the Guide hash: the launcher must never link back into itself.
        if (target.origin !== current.origin || target.pathname !== current.pathname) {
          footer.appendChild(link(labels.map, mapHref, 'link mo-guide-quiet'));
        }
      }
      if (footer.childNodes.length) body.appendChild(footer);
      placeAction();
    }

    function build() {
      if (root) return;
      if (!document.getElementById('mo-guide-style')) {
        var style = document.createElement('style'); style.id = 'mo-guide-style'; style.textContent = css; document.head.appendChild(style);
      }
      root = element('div', 'root'); root.hidden = true;
      var dim = element('div', 'dim'); dim.setAttribute('aria-hidden', 'true'); listen(dim, 'click', close);
      panel = element('div', 'panel'); panel.tabIndex = -1;
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'mo-guide-title');
      var grab = element('div', 'grab'); grab.setAttribute('aria-hidden', 'true');
      header = element('header', 'header'); body = element('div', 'body'); actionArea = element('div', 'action');
      actionArea.hidden = true;
      panel.append(grab, header, body); root.append(dim, panel); document.body.appendChild(root);
    }
    function lockScroll() {
      overflow = [document.documentElement, document.body].map(function (node) {
        var properties = ['overflow', 'overflow-x', 'overflow-y'].map(function (name) {
          return { name: name, value: node.style.getPropertyValue(name), priority: node.style.getPropertyPriority(name) };
        });
        node.style.setProperty('overflow', 'hidden', 'important');
        return { node: node, properties: properties, applied: properties.map(function (property) {
          return { name: property.name, value: node.style.getPropertyValue(property.name), priority: node.style.getPropertyPriority(property.name) };
        }) };
      });
    }
    function finishClose() {
      if (!opened) return;
      opened = false; closing = false; root.hidden = true;
      overflow.forEach(function (entry) {
        // Restore only if no other modal has taken ownership of these styles.
        if (!entry.applied.every(function (property) {
          return entry.node.style.getPropertyValue(property.name) === property.value &&
            entry.node.style.getPropertyPriority(property.name) === property.priority;
        })) return;
        entry.properties.forEach(function (property) { entry.node.style.removeProperty(property.name); });
        entry.properties.forEach(function (property) {
          if (property.value) entry.node.style.setProperty(property.name, property.value, property.priority);
        });
      });
      overflow = [];
      if (inertHost) { inertHost.removeAttribute('inert'); inertHost = null; }
      window.dispatchEvent(new Event('mo-guide:close'));
      if (opener && opener.isConnected && !lockAbove()) opener.focus({ preventScroll: true });
    }
    function finishNavigation() {
      if (!pendingHref) return;
      var href = pendingHref; pendingHref = null;
      clearTimeout(navigationTimer); navigationTimer = null;
      pushed = false; finishClose(); location.assign(href);
    }
    function close() {
      if (!opened || closing) return;
      // Never discard a newer host entry, and never add a marker to a router's state.
      var onTop = pushed && location.href === entryUrl && history.length === entryLength;
      if (onTop) { closing = true; history.back(); }
      else { pushed = false; finishClose(); finishNavigation(); }
    }
    function open(slug, source) {
      if (!content || !document.body || lockAbove() || closing) return;
      build();
      var firstOpen = !opened;
      if (firstOpen) {
        opener = source || document.activeElement;
        var dialog = opener && opener.closest && opener.closest('dialog[open]');
        var modal = opener && opener.closest && opener.closest('[aria-modal="true"]');
        (dialog || document.body).appendChild(root);
        if (modal && modal !== panel && modal !== dialog && !modal.hasAttribute('inert')) {
          modal.setAttribute('inert', ''); inertHost = modal;
        }
        history.pushState(history.state, '', location.href);
        pushed = true; entryUrl = location.href; entryLength = history.length;
        lockScroll();
      }
      opened = true; openerSlug = slug || null; detailSlug = null; trail = [];
      expanded = new Set(matchPart(content.parts, location.pathname, openerSlug) ? [] : [0]);
      render(); root.hidden = false; body.scrollTop = 0;
      if (firstOpen) window.dispatchEvent(new Event('mo-guide:open'));
      if (!lockAbove()) panel.focus({ preventScroll: true });
    }
    function consumeHash() {
      if (content && location.hash === '#guide' && document.body && !lockAbove()) {
        history.replaceState(history.state, '', location.pathname + location.search);
        if (!opened) open();
      }
    }
    function set(value) {
      content = value;
      if (opened) {
        var scroll = body.scrollTop, active = document.activeElement;
        var key = active && active.dataset.moGuideKey;
        render(); body.scrollTop = scroll;
        if (active && panel.contains(active)) return;
        focusKey(key);
      }
      consumeHash();
    }
    function lockAbove() {
      return document.documentElement.hasAttribute('data-mo-locked') || document.querySelector('.mo-lock-sheet, .mo-lock-overlay');
    }
    listen(window, 'popstate', function () {
      pushed = false;
      if (opened) finishClose();
      finishNavigation();
    });
    if (phone) listen(phone, 'change', placeAction);
    document.addEventListener('click', protect(function (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (event.button !== undefined && event.button !== 0)) return;
      var target = event.target.closest && event.target.closest('[data-mo-guide-open]');
      if (!target || !content) return;
      event.preventDefault(); open(target.getAttribute('data-mo-guide-open'), target);
    }), true);
    listen(document, 'keydown', function (event) {
      if (!opened || lockAbove()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key !== 'Tab') return;
      var nodes = Array.from(panel.querySelectorAll('button, a[href], [tabindex="0"]')).filter(function (node) {
        return !node.disabled && node.getClientRects().length;
      });
      var index = nodes.indexOf(document.activeElement);
      if (!nodes.length) { event.preventDefault(); panel.focus(); }
      else if (index === -1) {
        // A programmatically focused heading sits between controls in DOM order.
        var active = document.activeElement;
        var following = active && panel.contains(active) && active !== panel && nodes.filter(function (node) {
          return active.compareDocumentPosition(node) & (event.shiftKey ? 2 : 4);
        });
        var target = following && following.length ? following[event.shiftKey ? following.length - 1 : 0] : nodes[event.shiftKey ? nodes.length - 1 : 0];
        event.preventDefault(); target.focus();
      } else if (event.shiftKey ? index === 0 : index === nodes.length - 1) {
        event.preventDefault(); nodes[event.shiftKey ? nodes.length - 1 : 0].focus();
      }
    });
    listen(document, 'focusin', function (event) {
      if (opened && !panel.contains(event.target) && !lockAbove()) panel.focus({ preventScroll: true });
    });
    window.moGuide = { set: protect(set), open: protect(open), close: protect(close), isOpen: function () { return opened; } };
    if (window.__moGuideContent) set(window.__moGuideContent);
    if (document.readyState === 'loading') listen(document, 'DOMContentLoaded', consumeHash);
    window.dispatchEvent(new Event('mo-guide:ready'));
  } catch (_) {
    /* An optional Guide must never stop the host page. */
  }
}());
