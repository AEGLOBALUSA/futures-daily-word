/* MultiplyOS app switcher, the logic (X1). Pure, dependency-free, classic script. Load it first and synchronously
   in <head>, before any tracker: it reads and removes a `#mos=` sign-in hint from the address before anything else
   can see it. The sheet itself (mo-apps.js, mo-apps.css) is loaded deferred and reads this through window.moApps.
   Contract: design/apps/README.md. Types: mo-apps.d.ts. Pin: MOS-UI.sha256 (scripts/vendor.sh ui).
   What it touches: one GET of https://app.futures.church/apps.json (credentials omitted), sessionStorage['mos:hint'],
   and history.replaceState on a hint fragment. Nothing else. No innerHTML. No token. No ?email. */
(function (root) {
  'use strict';

  var APPS_URL = 'https://app.futures.church/apps.json';
  var ALL_APPS_URL = 'https://app.futures.church/';
  var HINT_KEY = 'mos:hint';
  var HINT_TTL_MS = 10 * 60 * 1000;
  var PAYLOAD_MAX = 8192;
  var EMAIL_MAX = 254;
  var PREFIX = '#mos=';
  var TIERS = { member: 0, pastor: 1, global: 2 };
  // Defence in depth: whatever apps.json says, these two never show below their tier.
  var FLOOR = { heartbeat: 'pastor', globalconnect: 'global' };
  var NATION_ALIASES = { AU: 'Australia', USA: 'United States', FUTUROS: 'Futuros' };
  var NATION_NAMES = { 'Australia': 1, 'United States': 1, 'Futuros': 1 };
  // Ported from multiplyos-launcher site/recent.js (GUESSES, guessNation). First match wins.
  var GUESSES = [
    { language: 'es', nation: 'Futuros' },
    { timeZone: 'Australia/', nation: 'Australia' },
    { timeZone: 'America/', nation: 'United States' }
  ];
  var ID_RE = /^[a-z]{1,24}$/;
  var EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

  function guessNation(language, timeZone) {
    var lang = typeof language === 'string' ? language.toLowerCase() : '';
    var zone = typeof timeZone === 'string' ? timeZone : '';
    for (var i = 0; i < GUESSES.length; i++) {
      var g = GUESSES[i];
      if (g.language && lang.indexOf(g.language) === 0) return g.nation;
      if (g.timeZone && zone.indexOf(g.timeZone) === 0) return g.nation;
    }
    return null;
  }

  function validEmail(s) {
    return typeof s === 'string' && s.length > 0 && s.length <= EMAIL_MAX && EMAIL_RE.test(s);
  }

  function toBase64Url(json) {
    var bytes = new TextEncoder().encode(json);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromBase64Url(s) {
    if (!/^[A-Za-z0-9_-]+$/.test(s) || s.length % 4 === 1) return null;
    try {
      var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
      var bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      return null;
    }
  }

  function isPlain(x) {
    return typeof x === 'object' && x !== null && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
  }

  function onlyKeys(o, keys) {
    var have = Object.keys(o);
    if (have.length !== keys.length) return false;
    for (var i = 0; i < keys.length; i++) if (!Object.prototype.hasOwnProperty.call(o, keys[i])) return false;
    return true;
  }

  /** The hint payload for #mos=, or null. Exactly {v:1, from, app, hint:{email}}; anything else is not a hint. */
  function decodeHint(hash) {
    try {
      if (typeof hash !== 'string' || hash.indexOf(PREFIX) !== 0) return null;
      var enc = hash.slice(PREFIX.length);
      if (!enc || enc.length > PAYLOAD_MAX) return null;
      var json = fromBase64Url(enc);
      if (json === null) return null;
      var raw = JSON.parse(json);
      if (!isPlain(raw) || !onlyKeys(raw, ['v', 'from', 'app', 'hint'])) return null;
      if (raw.v !== 1) return null;
      if (typeof raw.from !== 'string' || !ID_RE.test(raw.from)) return null;
      if (typeof raw.app !== 'string' || !ID_RE.test(raw.app)) return null;
      if (!isPlain(raw.hint) || !onlyKeys(raw.hint, ['email']) || !validEmail(raw.hint.email)) return null;
      return { from: raw.from, app: raw.app, email: raw.hint.email };
    } catch (e) {
      return null;
    }
  }

  function encodeHint(from, app, email) {
    if (!ID_RE.test(from) || !ID_RE.test(app) || !validEmail(email)) return null;
    return PREFIX + toBase64Url(JSON.stringify({ v: 1, from: from, app: app, hint: { email: email } }));
  }

  function normaliseNation(n) {
    if (typeof n !== 'string') return null;
    if (Object.prototype.hasOwnProperty.call(NATION_NAMES, n)) return n;
    var key = n.toUpperCase();
    return Object.prototype.hasOwnProperty.call(NATION_ALIASES, key) ? NATION_ALIASES[key] : null;
  }

  function httpsUrl(u) {
    if (typeof u !== 'string') return null;
    try {
      var p = new URL(u);
      return p.protocol === 'https:' && p.hostname ? p.href : null;
    } catch (e) {
      return null;
    }
  }

  function readinessOf(app, nation) {
    var r = nation && nation.readiness ? nation.readiness : app && app.readiness;
    return r && (r.state === 'ready' || r.state === 'paused') ? r.state : 'not-ready';
  }

  function needRank(app) {
    var declared = app.audience;
    var rank;
    if (declared === undefined || declared === null) rank = 0;
    else if (typeof declared === 'string' && Object.prototype.hasOwnProperty.call(TIERS, declared)) rank = TIERS[declared];
    else rank = TIERS.global; // an audience this code does not know is the strictest one
    var floor = Object.prototype.hasOwnProperty.call(FLOOR, app.id) ? TIERS[FLOOR[app.id]] : 0;
    return Math.max(rank, floor);
  }

  function create(env) {
    var cfg = null;          // what the app passed to set(), validated
    var picked = null;       // nation chosen from the sheet, in memory only
    var list = null;         // apps.json rows once read
    var loading = false;
    var failed = false;
    var opened = false;
    var inflight = null;

    function emit(name) {
      try {
        if (env.dispatchEvent && env.Event) env.dispatchEvent(new env.Event(name));
      } catch (e) { /* no listener, no harm */ }
    }

    function nowMs() { return env.now ? env.now() : Date.now(); }

    // ---- receiving side (runs now, at head-parse time) ----
    function parseHead() {
      try {
        var loc = env.location;
        var hint = decodeHint(loc && loc.hash);
        if (!hint) return; // not ours: a go or pick link, or nothing. Never touched.
        var s = env.sessionStorage;
        if (s) s.setItem(HINT_KEY, JSON.stringify({ email: hint.email, at: nowMs() }));
        if (env.history && env.history.replaceState) {
          env.history.replaceState(env.history.state, '', loc.pathname + loc.search);
        }
      } catch (e) { /* a blocked store still must not break the page */ }
    }

    function signinEmail() {
      try {
        var s = env.sessionStorage;
        if (!s) return null;
        var rawText = s.getItem(HINT_KEY);
        if (rawText === null || rawText === undefined) return null;
        s.removeItem(HINT_KEY);
        var rec = JSON.parse(rawText);
        if (!isPlain(rec) || !validEmail(rec.email) || typeof rec.at !== 'number') return null;
        var age = nowMs() - rec.at;
        if (age < 0 || age > HINT_TTL_MS) return null;
        return rec.email;
      } catch (e) {
        return null;
      }
    }

    // ---- configuration ----
    function set(c) {
      if (c === null || c === undefined) {
        cfg = null; picked = null;
        if (opened) close();
        emit('mo-apps:change');
        return;
      }
      if (typeof c !== 'object') return;
      var labels = {};
      if (c.labels && typeof c.labels === 'object') {
        Object.keys(c.labels).forEach(function (k) {
          if (typeof c.labels[k] === 'string' && c.labels[k].length <= 200) labels[k] = c.labels[k];
        });
      }
      cfg = {
        app: typeof c.app === 'string' && ID_RE.test(c.app) ? c.app : null,
        name: typeof c.name === 'string' && c.name.length <= 60 ? c.name : null,
        nation: normaliseNation(c.nation),
        tier: typeof c.tier === 'string' && Object.prototype.hasOwnProperty.call(TIERS, c.tier) ? c.tier : 'member',
        email: validEmail(c.email) ? c.email : null,
        lang: typeof c.lang === 'string' && c.lang.length <= 12 ? c.lang : 'en',
        labels: labels
      };
      emit('mo-apps:change');
    }

    function tierRank() { return cfg ? TIERS[cfg.tier] : 0; }

    // ---- the list ----
    function load() {
      if (list || inflight) return inflight;
      if (!env.fetch) { failed = true; return null; }
      loading = true; failed = false;
      inflight = env.fetch(APPS_URL, { credentials: 'omit', cache: 'no-cache' })
        .then(function (res) {
          if (!res || !res.ok) throw new Error('apps_status');
          return res.json();
        })
        .then(function (data) {
          if (!data || !Array.isArray(data.apps)) throw new Error('apps_shape');
          list = data.apps.filter(function (a) { return isPlain(a) && typeof a.id === 'string' && ID_RE.test(a.id); });
        })
        .catch(function () { failed = true; })
        .then(function () { loading = false; inflight = null; emit('mo-apps:change'); });
      return inflight;
    }

    function deviceGuess() {
      var language = '', zone = '';
      try { language = (env.navigator && env.navigator.language) || ''; } catch (e) { /* no guess */ }
      try { zone = env.Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e2) { /* no guess */ }
      return guessNation(language, zone);
    }

    // passed -> picked -> guess; a name that is not one of the row's own nations is never used; else the first.
    function chooseNation(names) {
      if (!names.length) return null;
      var order = [cfg && cfg.nation, picked, deviceGuess()];
      for (var i = 0; i < order.length; i++) {
        if (order[i] && names.indexOf(order[i]) !== -1) return order[i];
      }
      return names[0];
    }

    function here() { return cfg && cfg.app; }

    function buildRow(a) {
      var id = a.id;
      var isHere = id === here();
      var appState = readinessOf(a);
      var row = {
        id: id, name: typeof a.name === 'string' ? a.name : id, here: isHere,
        state: 'ready', openable: false, url: null, nation: null, nations: [],
        note: a.readiness && typeof a.readiness.note === 'string' ? a.readiness.note : null,
        note_es: a.readiness && typeof a.readiness.note_es === 'string' ? a.readiness.note_es : null
      };
      if (Array.isArray(a.nations)) {
        var ns = [];
        a.nations.forEach(function (n) {
          if (!isPlain(n) || typeof n.name !== 'string') return;
          var u = httpsUrl(n.url);
          var st = readinessOf(a, n);
          if (!u || st === 'paused') return;
          ns.push({ name: n.name, url: u, state: st });
        });
        var readyNs = ns.filter(function (n) { return n.state === 'ready'; });
        if (!ns.length && !isHere) return null;
        row.state = readyNs.length ? 'ready' : 'not-ready';
        row.nations = readyNs.map(function (n) { return { name: n.name, url: n.url, here: false, main: false }; });
        row.nation = chooseNation(readyNs.map(function (n) { return n.name; }));
        row.nations.forEach(function (n) {
          n.main = n.name === row.nation;
          n.here = isHere && cfg.nation === n.name;
        });
        row.openable = row.state === 'ready';
        var main = row.nations.filter(function (n) { return n.main; })[0];
        row.url = main ? main.url : null;
      } else {
        if (appState === 'paused' && !isHere) return null;
        var u2 = httpsUrl(a.url);
        if (!u2 && !isHere) return null;
        row.state = appState === 'ready' ? 'ready' : 'not-ready';
        row.openable = row.state === 'ready';
        row.url = u2;
      }
      if (isHere) {
        row.state = 'ready'; row.openable = true; row.url = homeUrl();
      }
      return row;
    }

    function homeUrl() {
      try { return new URL('/', env.location.href).href; } catch (e) { return '/'; }
    }

    function rows() {
      var out = [];
      var sawHere = false;
      (list || []).forEach(function (a) {
        var isHere = a.id === here();
        if (!isHere && needRank(a) > tierRank()) return;
        var r = buildRow(a);
        if (!r) return;
        if (isHere) sawHere = true;
        out.push(r);
      });
      if (!sawHere && here()) {
        out.unshift({
          id: here(), name: cfg.name || here(), here: true, state: 'ready', openable: true,
          url: homeUrl(), nation: cfg.nation, nations: [], note: null, note_es: null
        });
      }
      return out;
    }

    function nextStep(all) {
      var h = here();
      var want = null;
      if (h === 'connect') want = tierRank() >= TIERS.pastor ? 'heartbeat' : 'develop';
      else if (h) want = 'connect';
      if (!want || want === h) return null;
      for (var i = 0; i < all.length; i++) {
        var r = all[i];
        if (r.id === want && !r.here && r.openable && r.url) {
          return { id: r.id, name: r.name, nation: r.nation, url: r.url };
        }
      }
      return null;
    }

    function model() {
      var all = rows();
      return {
        open: opened, loading: loading, failed: failed,
        app: here() || null, nation: cfg ? cfg.nation : null, tier: cfg ? cfg.tier : 'member',
        lang: cfg ? cfg.lang : 'en', labels: cfg ? cfg.labels : {},
        rows: all, next: nextStep(all), all: { url: ALL_APPS_URL }
      };
    }

    // ---- navigating ----
    function sameOrigin(url) {
      try { return new URL(url).origin === new URL(env.location.href).origin; } catch (e) { return true; }
    }

    // The URL to open for a row (and nation). Adds the sign-in hint only when the email is known and the origin differs.
    function hrefFor(id, nation) {
      var row = null;
      var all = rows();
      for (var i = 0; i < all.length; i++) if (all[i].id === id) row = all[i];
      if (!row || !row.openable || !row.url) return null;
      var url = row.url;
      if (nation) {
        var n = row.nations.filter(function (x) { return x.name === nation; })[0];
        if (!n) return null;
        url = n.url;
      }
      if (row.here && !nation) return url;
      if (cfg && cfg.email && cfg.app && !sameOrigin(url)) {
        var frag = encodeHint(cfg.app, id, cfg.email);
        if (frag) return url.split('#')[0] + frag;
      }
      return url;
    }

    function navigate(id, nation) {
      var href = hrefFor(id, nation);
      if (!href) return false;
      close();
      env.location.assign(href);
      return true;
    }

    function pickNation(name) {
      var n = normaliseNation(name);
      if (n) { picked = n; emit('mo-apps:change'); }
    }

    // ---- open and close ----
    function locked() {
      try {
        var d = env.document;
        return !!(d && ((d.documentElement && d.documentElement.hasAttribute('data-mo-locked')) ||
          (d.querySelector && d.querySelector('.mo-lock-sheet, .mo-lock-overlay'))));
      } catch (e) { return false; }
    }

    function open() {
      if (opened || locked()) return;
      try { if (env.moGuide && env.moGuide.isOpen && env.moGuide.isOpen()) env.moGuide.close(); } catch (e) { /* guide gone */ }
      opened = true;
      emit('mo-apps:open');
      load();
    }

    function close() {
      if (!opened) return;
      opened = false;
      emit('mo-apps:close');
    }

    parseHead();
    if (env.addEventListener) env.addEventListener('mo-guide:open', function () { close(); });

    return {
      set: set, open: open, close: close, isOpen: function () { return opened; }, signinEmail: signinEmail,
      // For mo-apps.js only. Not part of the app contract.
      model: model, navigate: navigate, hrefFor: hrefFor, pickNation: pickNation
    };
  }

  var api = {
    create: create, guessNation: guessNation, decodeHint: decodeHint, encodeHint: encodeHint,
    HINT_KEY: HINT_KEY, HINT_TTL_MS: HINT_TTL_MS, APPS_URL: APPS_URL
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (root && root.document && !root.moApps) {
    var win = root;
    root.moApps = create({
      location: win.location, history: win.history, document: win.document, navigator: win.navigator,
      Intl: win.Intl, Event: win.Event, dispatchEvent: function (e) { return win.dispatchEvent(e); },
      addEventListener: function (n, f) { win.addEventListener(n, f); },
      get sessionStorage() { try { return win.sessionStorage; } catch (e) { return null; } },
      get moGuide() { return win.moGuide; },
      fetch: win.fetch ? function (u, o) { return win.fetch(u, o); } : null
    });
  }
})(typeof window !== 'undefined' ? window : null);
