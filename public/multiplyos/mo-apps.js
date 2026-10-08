/* MultiplyOS app switcher sheet. Load after mo-apps.core.js, with mo-apps.css.
   Labels: title, close, here, openApp ({app}), next, loading, failed, notReady,
   all, nations ({app}). Supply translations through moApps.set({ labels }).
   mos-text-ignore-file: sheet type has a 15px floor. */
(function () {
  'use strict';
  if (!window.moApps || document.querySelector('[data-mo-apps-mounted]')) return;

  var root, panel, header, body, action, status, opener, opened = false;
  var inert = [], overflow = [], lockObserver;
  var phone = window.matchMedia('(max-width: 768px)');
  var defaults = {
    title: 'Your apps', close: 'Close', here: 'Here', openApp: 'Open {app}',
    next: 'Your next app', loading: 'Loading your apps…',
    failed: 'Your apps could not load. Open All apps, or close and try again.',
    notReady: 'Not ready yet.', all: 'All apps', nations: '{app} nations'
  };

  function element(tag, name, text) {
    var node = document.createElement(tag);
    if (name) node.className = 'mo-apps-' + name;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function words(model, key, app) {
    var value = model.labels && model.labels[key];
    return (typeof value === 'string' ? value : defaults[key]).split('{app}').join(app || '');
  }
  function modified(event) {
    return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ||
      (event.button !== undefined && event.button !== 0);
  }
  function locked() {
    return document.documentElement.hasAttribute('data-mo-locked') ||
      document.querySelector('.mo-lock-sheet, .mo-lock-overlay');
  }
  function close() { window.moApps.close(); }
  function icon() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'mo-apps-icon');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'm9 5 7 7-7 7');
    svg.appendChild(path);
    return svg;
  }
  function appLink(text, url, key, id, nation) {
    var node = element('a', 'link', text);
    node.href = url;
    node.dataset.moAppsKey = key;
    node.addEventListener('click', function (event) {
      if (modified(event)) return;
      event.preventDefault();
      if (locked()) { close(); return; }
      if (nation) window.moApps.pickNation(nation);
      window.moApps.navigate(id, nation || undefined);
    });
    return node;
  }
  function focusKey(key) {
    var target = Array.from(panel.querySelectorAll('[data-mo-apps-key]')).find(function (node) {
      return node.dataset.moAppsKey === key;
    });
    (target || panel).focus({ preventScroll: true });
  }
  function render(model) {
    var active = document.activeElement;
    var hadFocus = panel.contains(active);
    var key = hadFocus && active.dataset.moAppsKey;
    var scroll = body.scrollTop;
    panel.lang = model.lang || 'en';
    header.replaceChildren(); body.replaceChildren(); action.replaceChildren();
    var title = element('h2', 'title', words(model, 'title'));
    title.id = 'mo-apps-title';
    var dismiss = element('button', 'close', words(model, 'close'));
    dismiss.type = 'button'; dismiss.dataset.moAppsKey = 'close';
    dismiss.addEventListener('click', close);
    header.append(title, dismiss);
    var message = model.loading ? words(model, 'loading') : model.failed ? words(model, 'failed') : '';
    // Keep the live region mounted so asynchronous outcomes are announced.
    if (status.textContent !== message) status.textContent = message;
    status.hidden = !message;
    body.setAttribute('aria-busy', String(model.loading));
    var list = element('ul', 'list');
    model.rows.forEach(function (row) {
      if (model.failed && !row.here) return;
      var item = element('li', 'item');
      var line = row.openable && row.url ? appLink('', row.url, 'app:' + row.id, row.id) : element('div', 'row');
      line.classList.add('mo-apps-row');
      line.appendChild(element('span', 'name', row.name));
      if (row.here) {
        line.setAttribute('aria-current', 'page');
        line.appendChild(element('span', 'here', words(model, 'here')));
      } else if (row.openable) line.appendChild(icon());
      item.appendChild(line);
      if (!row.openable) {
        var note = /^es(?:-|$)/i.test(model.lang) && row.note_es ? row.note_es : row.note;
        item.appendChild(element('p', 'note', note || words(model, 'notReady')));
      }
      // The core supplies ready nations only. Keep even a sole ready pill when
      // its row is a nation-based app; unavailable nations never become controls.
      if (row.nations.length && !model.failed) {
        var nations = element('div', 'nations');
        nations.setAttribute('role', 'group');
        nations.setAttribute('aria-label', words(model, 'nations', row.name));
        row.nations.forEach(function (nation) {
          var pill = appLink(nation.name, nation.url, 'nation:' + row.id + ':' + nation.name, row.id, nation.name);
          pill.classList.add('mo-apps-nation');
          pill.setAttribute('aria-label', words(model, 'openApp', row.name) + ' · ' + nation.name);
          if (nation.main) pill.classList.add('mo-apps-nation-main');
          if (nation.here) pill.setAttribute('aria-current', 'true');
          nations.appendChild(pill);
        });
        item.appendChild(nations);
      }
      list.appendChild(item);
    });
    body.appendChild(list);
    if (model.next && !model.failed && !model.loading) {
      var next = model.next;
      action.appendChild(element('p', 'hint', words(model, 'next')));
      var main = appLink(words(model, 'openApp', next.name), next.url, 'next', next.id, next.nation);
      main.classList.add('mo-apps-next', 'mo-button--main', 'mo-next');
      if (next.nation) main.appendChild(element('span', 'destination', next.nation));
      action.appendChild(main);
    }
    var all = element('a', 'all', words(model, 'all'));
    all.href = model.all.url; all.dataset.moAppsKey = 'all';
    all.appendChild(icon());
    all.addEventListener('click', function (event) { if (!modified(event)) close(); });
    action.appendChild(all);
    body.scrollTop = scroll;
    if (hadFocus) focusKey(key);
    position();
  }
  function build() {
    if (root) return;
    root = element('div', 'root'); root.hidden = true;
    root.setAttribute('data-mo-apps-mounted', '');
    var dim = element('div', 'dim'); dim.setAttribute('aria-hidden', 'true');
    dim.addEventListener('click', close);
    panel = element('div', 'panel'); panel.id = 'mo-apps-panel'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'mo-apps-title');
    header = element('header', 'header');
    status = element('p', 'status'); status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
    body = element('div', 'body'); action = element('footer', 'action');
    panel.append(header, status, body, action); root.append(dim, panel);
    document.body.appendChild(root);
  }
  function position() {
    if (!opened) return;
    var viewport = window.visualViewport;
    var top = viewport ? viewport.offsetTop : 0, left = viewport ? viewport.offsetLeft : 0;
    var height = viewport ? viewport.height : window.innerHeight;
    var width = viewport ? viewport.width : window.innerWidth;
    root.style.top = top + 'px'; root.style.left = left + 'px';
    root.style.width = width + 'px'; root.style.height = height + 'px';
    panel.style.removeProperty('left'); panel.style.removeProperty('top');
    panel.style.removeProperty('height');
    if (phone.matches) return;
    var rect = opener && opener.isConnected ? opener.getBoundingClientRect() : { left: left + 16, top: top + 16, bottom: top + 16 };
    var gap = 12, inset = 16;
    var below = height - (rect.bottom - top) - gap - inset;
    var above = rect.top - top - gap - inset;
    // Prefer below the M; flip above only when that offers more useful space.
    var useAbove = below < 400 && above > below;
    var available = useAbove ? above : below;
    var panelHeight = Math.min(640, height - inset * 2);
    if (available >= 320) panelHeight = Math.min(panelHeight, available);
    panel.style.height = Math.max(0, panelHeight) + 'px';
    var y = useAbove ? rect.top - top - gap - panelHeight : rect.bottom - top + gap;
    panel.style.top = Math.max(inset, Math.min(y, height - panelHeight - inset)) + 'px';
    panel.style.left = Math.max(inset, Math.min(rect.left - left, width - panel.offsetWidth - inset)) + 'px';
  }
  function isolate() {
    // Also works when the M belongs to a native dialog in the browser top layer.
    var branch = root;
    while (branch.parentElement) {
      Array.from(branch.parentElement.children).forEach(function (node) {
        if (node !== branch && !node.hasAttribute('inert') && !/^(SCRIPT|STYLE|LINK)$/.test(node.tagName)) {
          node.setAttribute('inert', ''); inert.push(node);
        }
      });
      if (branch.parentElement === document.body) break;
      branch = branch.parentElement;
    }
    overflow = [document.documentElement, document.body].map(function (node) {
      var saved = ['overflow', 'overflow-x', 'overflow-y'].map(function (name) {
        return [name, node.style.getPropertyValue(name), node.style.getPropertyPriority(name)];
      });
      node.style.setProperty('overflow', 'hidden', 'important');
      return { node: node, saved: saved };
    });
  }
  function sync() {
    if (!document.body) return;
    build();
    document.querySelectorAll('[data-mo-apps-open]').forEach(function (source) {
      source.setAttribute('aria-haspopup', 'dialog');
      source.setAttribute('aria-controls', panel.id);
      source.setAttribute('aria-expanded', String(opened && source === opener));
      if (!source.matches('a[href], button, input, select, textarea')) {
        if (!source.hasAttribute('tabindex')) source.tabIndex = 0;
        source.setAttribute('role', 'button');
      }
    });
    var model = window.moApps.model();
    if (!model.open) { finishClose(); return; }
    var first = !opened;
    if (first) {
      if (!opener || !opener.isConnected) opener = document.querySelector('[data-mo-apps-open]');
      var dialog = opener && opener.closest('dialog[open]');
      (dialog || document.body).appendChild(root);
      opened = true; root.hidden = false; isolate();
      if (opener) { opener.setAttribute('aria-expanded', 'true'); opener.setAttribute('aria-controls', panel.id); }
      lockObserver = new MutationObserver(function () { if (opened && locked()) close(); });
      lockObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mo-locked', 'class'], childList: true, subtree: true });
    }
    render(model);
    if (first) { body.scrollTop = 0; panel.focus({ preventScroll: true }); }
  }
  function finishClose() {
    if (!opened) return;
    opened = false; root.hidden = true;
    if (lockObserver) lockObserver.disconnect();
    inert.forEach(function (node) { node.removeAttribute('inert'); }); inert = [];
    overflow.forEach(function (entry) {
      if (entry.node.style.getPropertyValue('overflow') !== 'hidden' || entry.node.style.getPropertyPriority('overflow') !== 'important') return;
      entry.saved.forEach(function (property) { entry.node.style.removeProperty(property[0]); });
      entry.saved.forEach(function (property) { if (property[1]) entry.node.style.setProperty(property[0], property[1], property[2]); });
    });
    overflow = [];
    if (opener) {
      opener.setAttribute('aria-expanded', 'false');
      if (opener.isConnected && !locked()) opener.focus({ preventScroll: true });
    }
    opener = null;
  }
  document.addEventListener('click', function (event) {
    if (modified(event)) return;
    var source = event.target.closest && event.target.closest('[data-mo-apps-open]');
    if (!source) return;
    event.preventDefault(); event.stopPropagation();
    opener = source;
    // Non-button lockups still need to accept restored keyboard focus.
    if (!source.matches('a[href], button, input, select, textarea, [tabindex]')) source.tabIndex = 0;
    source.setAttribute('aria-haspopup', 'dialog');
    window.moApps.open();
    sync();
  }, true);
  document.addEventListener('keydown', function (event) {
    var source = event.target.closest && event.target.closest('[data-mo-apps-open]');
    if (!opened && source && !source.matches('a[href], button, input, select, textarea') &&
        (event.key === 'Enter' || event.key === ' ') && !modified(event)) {
      event.preventDefault(); source.click(); return;
    }
    if (!opened || locked()) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key !== 'Tab') return;
    var nodes = Array.from(panel.querySelectorAll('a[href], button, [tabindex="0"]')).filter(function (node) {
      return !node.disabled && node.getClientRects().length;
    });
    var index = nodes.indexOf(document.activeElement);
    if (index === -1 || (event.shiftKey ? index === 0 : index === nodes.length - 1)) {
      event.preventDefault();
      (nodes[event.shiftKey ? nodes.length - 1 : 0] || panel).focus();
    }
  }, true);
  document.addEventListener('focusin', function (event) {
    if (opened && !locked() && !panel.contains(event.target)) panel.focus({ preventScroll: true });
  });
  // core.open emits before it starts loading; render after that synchronous turn.
  window.addEventListener('mo-apps:open', function () { Promise.resolve().then(sync); });
  window.addEventListener('mo-apps:close', finishClose);
  window.addEventListener('mo-apps:change', sync);
  window.addEventListener('resize', position);
  document.addEventListener('scroll', position, true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', position);
    window.visualViewport.addEventListener('scroll', position);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  else sync();
}());
