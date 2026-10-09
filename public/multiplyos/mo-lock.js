/*
 * MultiplyOS device lock
 *
 * Integration:
 * 1. Load synchronously in <head>: <script src="/multiplyos/mo-lock.js"
 *    data-public="/c/,/p/,/give"></script>. Public path prefixes are read at
 *    head time; on those paths this script has no lock, sheet, switch, or seen
 *    writes. The pathname is re-checked before every lock decision, including
 *    client-side navigation. Required apps also add data-required="true" to
 *    this same tag — see step 2 for why it is repeated here.
 * 2. In the signed-in shell, add:
 *    <span hidden data-mo-lock-user="<auth user id>" data-mo-lock-app="Connect"
 *      data-mo-lock-signout="/auth/signout"></span>
 *    data-mo-lock-signout is optional (default: /login). Optional:
 *    data-mo-lock-required="true". There is no per-app timer: every lock
 *    timer is LOCK_GRACE_MS, 60 minutes (Ashley's ruling, 30 Sep 2026), and
 *    data-mo-lock-grace is no longer read.
 *    data-required="true" on the <head> script tag (step 1) is required
 *    alongside data-mo-lock-required="true" on this marker in required apps:
 *    this element is not in the document yet when the synchronous head
 *    script runs, so the pre-paint hide that keeps a signed-in page from
 *    flashing before boot() runs (data-mo-setup-pending, when there is no
 *    record yet and "seen" is stale or a failed setup still waits for a
 *    password) needs its own, earlier read of "required".
 * 3. On the sign-in page, add data-mo-lock-signin to any element, such as the form.
 *    This marker only removes lock UI on that page; sign-out should call clear().
 * 4. Optionally add <div data-mo-lock-toggle></div> in the signed-in UI.
 * 5. Optionally call window.MOLock.clear() from the app's own sign-out handler.
 * 6. Every password sign-in must tell the kit, or the person is asked for
 *    Face ID straight after typing a password. Client-side sign-in calls
 *    window.MOLock.signedIn() once the password is accepted. Server-side
 *    sign-in (a server action's redirect(), or a route handler's 302) sets a
 *    one-shot, non-httpOnly, host-only cookie named "mo-lock-signedin" whose
 *    value is the server's Date.now() in milliseconds, maxAge 60, right
 *    before the redirect. The kit reads it at head time and on every private
 *    boot(), deletes it (host-only and every parent-domain form), and treats
 *    it as a signedIn() call only if the timestamp is within 12 hours of this
 *    device's clock. Any other value is ignored. The 12 hours is only a
 *    sanity bound: what keeps the cookie short-lived is the browser's own
 *    Max-Age=60 (counted on this device's clock from when it arrived) and the
 *    delete on first read. A tighter bound compared the server's clock with
 *    the phone's, so a phone set a couple of minutes off the server dropped
 *    every real sign-in and looped on the setup sheet for good.
 * 7. "Use your password instead" only navigates to the sign-out URL. It never
 *    deletes this device's record itself: the record stays until a different
 *    person signs in on this device (uid change) or the app's own sign-out
 *    calls clear(). Just before navigating it writes sessionStorage
 *    "mo-lock:signout-at" (Date.now()), so an app whose sign-out URL is a
 *    client-side route can check that the kit, in this tab, asked for it.
 *
 * This is a device-side lock only. It has no server component. The observer is
 * intentionally idempotent: it renders new toggle hosts once and refreshes
 * existing controls only after an explicit lock-state change.
 */
(function () {
  'use strict';

  // Ashley's ruling, 6 Oct 2026: device lock off for now ("a simple sign in"). Set to false to restore the lock unchanged.
  var LOCK_OFF = false;
  if (LOCK_OFF) {
    try {
      var offRoot = document.documentElement;
      offRoot.removeAttribute('data-mo-locked');
      offRoot.removeAttribute('data-mo-setup-pending');
      var offStyle = document.createElement('style');
      offStyle.id = 'mo-lock-style';
      offStyle.textContent = '[data-mo-lock-toggle]{display:none!important}';
      (document.head || offRoot).appendChild(offStyle);
    } catch (_) {}
    var noop = function () {};
    window.MOLock = { clear: noop, lock: noop, isOn: function () { return false; }, signedIn: noop, available: false };
    return;
  }

  try {
    var root = document.documentElement;
    var publicScript = document.currentScript || document.querySelector('script[src*="mo-lock.js"]');
    var publicPrefixes = publicScript ? (publicScript.getAttribute('data-public') || '').split(',').map(function (prefix) { return prefix.trim(); }).filter(Boolean) : [];
    // A required app repeats "required" on this tag, not only on the signed-in
    // marker in body: that marker is not in the document yet when this
    // synchronous head script runs, so head-time code (the pre-paint hide
    // below) cannot read it.
    var scriptRequired = publicScript ? publicScript.getAttribute('data-required') === 'true' : false;
    var storage;
    var setupShown = false;
    var current = null;
    var availablePromise;
    // What platformAvailable() answered in this document: null until it
    // has, then true or false.
    var platformOk = null;
    var lastMarkerUid = null;
    var signInSeen = false;
    var overlayBuilt = false;
    var lastPageWasPublic = false;
    var lastPageWasSignIn = false;
    // Set by the DOMContentLoaded listener. Until the document has finished
    // parsing, a missing signed-in marker may simply not have arrived yet.
    var domParsed = false;
    // 'password': after a failed passkey setup in required mode, a password
    // sign-in unlocks this device so a device that reports Face ID as
    // available but can never save one does not strand a volunteer leader in
    // a setup-fail/sign-out loop. The failure alone proves nothing (a
    // cancelled system prompt is a failure too): it is recorded as
    // "pending", and only a real password sign-in afterwards — signedIn(),
    // or the server's sign-in cookie — turns it into "proved". Only "proved"
    // skips the sheet, and only until this device has been away
    // LOCK_GRACE_MS (closed, hidden, locked, or not opened): then
    // expireStaleProofs() puts it back to "pending" and the required sheet
    // asks again, the same 60 minutes after which a Face ID record re-locks.
    // Switch to 'block' — and build that sheet copy — only on Ashley's
    // ruling.
    var setupFailureFallback = 'password';
    // Ashley's ruling, 30 Sep 2026: "eveyrthing should be on a 60 min
    // timer". ONE timer for every lock: a Face ID record locks again, and a
    // phone that cannot save Face ID asks for the password again, once this
    // device has been away this long since "seen" (its last activity). No
    // app can set a shorter or longer one.
    var LOCK_GRACE_MS = 60 * 60 * 1000;
    var SIGNIN_COOKIE = 'mo-lock-signedin';
    // A sanity bound on the server's timestamp, not a freshness window: see
    // step 6 above and signInCookieFresh().
    var SIGNIN_COOKIE_SANITY_MS = 12 * 60 * 60 * 1000;

    var STRINGS = {
      en: {
        locked: '{app} is locked', openWith: 'Open with {platform}', password: 'Use your password instead',
        unlockError: "That didn't work. Try again, or use your password.", setupHeading: 'Open {app} with {platform}?',
        setupCopy: "Next time, {app} opens when your phone sees it's you. No password to type.",
        requiredCopy: "{app} asks for this to keep people's details safe.", turnOn: 'Turn on {platform}',
        setupError: "That didn't work. You can turn it on later in your settings.", later: 'Not now',
        toggle: '{platform} to open {app}', thisApp: 'this app', noBiometric: 'This device has no Face ID or fingerprint.',
        requiredOn: '{platform} is on. {app} needs it to open.',
        setupBlockedCopy: "That didn't work, so {platform} is still off. Tap “{turnOn}” to try again. Or tap “{password}”: you'll be signed out, then sign back in with your password. If this phone can't save {platform}, we'll ask for your password when you come back after an hour away.",
        face: 'Face ID', touch: 'Touch ID', biometric: 'fingerprint or face', hello: 'Windows Hello', screen: 'screen lock'
      },
      es: {
        locked: '{app} está bloqueado', openWith: 'Abrir con {platform}', password: 'Usar tu contraseña',
        unlockError: 'No funcionó. Inténtalo de nuevo o usa tu contraseña.', setupHeading: '¿Abrir {app} con {platform}?',
        setupCopy: 'La próxima vez, {app} se abrirá cuando tu teléfono te reconozca. No tendrás que escribir una contraseña.',
        requiredCopy: '{app} lo solicita para mantener seguros los datos de las personas.', turnOn: 'Activar {platform}',
        setupError: 'No funcionó. Puedes activarlo más tarde en tus ajustes.', later: 'Ahora no',
        toggle: '{platform} para abrir {app}', thisApp: 'esta aplicación', noBiometric: 'Este dispositivo no tiene Face ID ni huella digital.',
        requiredOn: '{platform} está activado. {app} lo necesita para abrir.',
        setupBlockedCopy: 'No funcionó, así que {platform} sigue desactivado. Toca «{turnOn}» para intentarlo de nuevo. O toca «{password}»: se cerrará tu sesión y luego entrarás de nuevo con tu contraseña. Si este teléfono no puede guardar {platform}, te pediremos tu contraseña cuando vuelvas después de una hora sin usar {app}.',
        face: 'Face ID', touch: 'Touch ID', biometric: 'huella o rostro', hello: 'Windows Hello', screen: 'bloqueo de pantalla'
      },
      id: {
        locked: '{app} terkunci', openWith: 'Buka dengan {platform}', password: 'Gunakan kata sandi Anda',
        unlockError: 'Tidak berhasil. Coba lagi atau gunakan kata sandi Anda.', setupHeading: 'Buka {app} dengan {platform}?',
        setupCopy: 'Lain kali, {app} akan terbuka saat ponsel mengenali Anda. Tidak perlu mengetikkan kata sandi.',
        requiredCopy: '{app} memerlukannya untuk menjaga keamanan data orang-orang.', turnOn: 'Aktifkan {platform}',
        setupError: 'Tidak berhasil. Anda dapat mengaktifkannya nanti di pengaturan.', later: 'Nanti saja',
        toggle: '{platform} untuk membuka {app}', thisApp: 'aplikasi ini', noBiometric: 'Perangkat ini tidak memiliki Face ID atau sidik jari.',
        requiredOn: '{platform} aktif. {app} memerlukannya untuk dibuka.',
        setupBlockedCopy: 'Tidak berhasil, jadi {platform} masih nonaktif. Ketuk “{turnOn}” untuk mencoba lagi. Atau ketuk “{password}”: Anda akan keluar, lalu masuk lagi dengan kata sandi. Jika ponsel ini tidak dapat menyimpan {platform}, kami akan meminta kata sandi Anda saat Anda kembali setelah satu jam tidak menggunakan {app}.',
        face: 'Face ID', touch: 'Touch ID', biometric: 'sidik jari atau wajah', hello: 'Windows Hello', screen: 'kunci layar'
      },
      pt: {
        locked: '{app} está bloqueado', openWith: 'Abrir com {platform}', password: 'Usar sua senha',
        unlockError: 'Não funcionou. Tente de novo ou use sua senha.', setupHeading: 'Abrir {app} com {platform}?',
        setupCopy: 'Da próxima vez, {app} abre quando seu celular reconhecer você. Sem digitar senha.',
        requiredCopy: '{app} pede isso para manter seguros os dados das pessoas.', turnOn: 'Ativar {platform}',
        setupError: 'Não funcionou. Você pode ativar mais tarde nas configurações.', later: 'Agora não',
        toggle: '{platform} para abrir {app}', thisApp: 'este app', noBiometric: 'Este dispositivo não tem Face ID nem impressão digital.',
        requiredOn: '{platform} está ativado. {app} precisa dele para abrir.',
        setupBlockedCopy: 'Não funcionou, então {platform} continua desativado. Toque em “{turnOn}” para tentar de novo. Ou toque em “{password}”: sua sessão será encerrada e você entra de novo com sua senha. Se este celular não puder salvar {platform}, vamos pedir sua senha quando você voltar depois de uma hora sem usar {app}.',
        face: 'Face ID', touch: 'Touch ID', biometric: 'impressão digital ou rosto', hello: 'Windows Hello', screen: 'bloqueio de tela'
      }
    };

    function language() {
      try { var lang = (document.documentElement.lang || '').slice(0, 2).toLowerCase(); return STRINGS[lang] ? lang : 'en'; } catch (_) { return 'en'; }
    }

    function text(key, values) {
      var value = STRINGS[language()][key] || STRINGS.en[key] || '';
      // split/join, not replace(): a string pattern in replace() changes only
      // the first match, and setupBlockedCopy names {platform} twice.
      Object.keys(values || {}).forEach(function (name) { value = value.split('{' + name + '}').join(values[name]); });
      return value;
    }

    function isPublicPage() {
      // Whole segments only. A bare prefix match made "/connect" also match
      // "/connected/*" (a staff workspace), so that workspace silently ran with
      // no lock at all. See Heartbeat's own middleware.ts, which fixed the same
      // startsWith bug the same way.
      try {
        var path = location.pathname || '';
        return publicPrefixes.some(function (prefix) {
          var p = prefix.replace(/\/$/, '');
          return path === p || path.indexOf(p + '/') === 0;
        });
      } catch (_) { return false; }
    }

    function isSignInPage() {
      try { return !!marker('[data-mo-lock-signin]'); } catch (_) { return false; }
    }

    function clearPublicUi() {
      if (!isPublicPage()) return;
      try {
        closeSheet(); removeOverlay(); root.removeAttribute('data-mo-locked');
        setupShown = false;
        document.querySelectorAll('[data-mo-lock-toggle]').forEach(function (host) { host.textContent = ''; host.removeAttribute('data-mo-lock-rendered'); });
      } catch (_) {}
    }

    function initStorage() {
      if (storage || isPublicPage()) return;
      try {
        storage = window.localStorage;
        storage.setItem('mo-lock:test', '1');
        storage.removeItem('mo-lock:test');
      } catch (_) {
        storage = null;
      }
    }

    initStorage();

    function availableBase() {
      try {
        return !!(storage && window.PublicKeyCredential && navigator.credentials &&
          typeof navigator.credentials.create === 'function' &&
          typeof navigator.credentials.get === 'function');
      } catch (_) {
        return false;
      }
    }

    function platformAvailable() {
      try {
        if (!availableBase()) return Promise.resolve(false);
        if (!availablePromise) {
          availablePromise = PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
            .then(function (value) { platformOk = value === true; return platformOk; }, function () { platformOk = false; return false; });
        }
        return availablePromise;
      } catch (_) {
        return Promise.resolve(false);
      }
    }

    function readRecord() {
      try {
        if (!storage) return null;
        var value = JSON.parse(storage.getItem('mo-lock:v1') || 'null');
        return value && typeof value === 'object' && value.credId && value.uid ? value : null;
      } catch (_) {
        return null;
      }
    }

    function writeRecord(record) {
      try { if (storage) storage.setItem('mo-lock:v1', JSON.stringify(record)); } catch (_) {}
    }

    function deleteRecord() {
      try { if (storage) storage.removeItem('mo-lock:v1'); } catch (_) {}
    }

    var SETUP_FAILED_PREFIX = 'mo-lock:setup-failed:';
    function setupFailedKey(uid) { return SETUP_FAILED_PREFIX + uid; }

    // In localStorage, beside "seen" (it was sessionStorage while the rule
    // was "the next open asks again"): the 60-minute timer has to hold across
    // an app relaunch too, which empties sessionStorage, so a relaunch ten
    // minutes later does not ask and one two hours later does. A failure
    // writes "pending" and nothing more: a cancelled system prompt is a
    // failure too, and cancelling proves nothing about who is holding the
    // phone. A failure already proved stays proved until expireStaleProofs().
    function markSetupFailed(uid) {
      try {
        if (!storage || storage.getItem(setupFailedKey(uid)) === 'proved') return;
        storage.setItem(setupFailedKey(uid), 'pending');
      } catch (_) {}
    }

    function setupFailedKeys() {
      var keys = [];
      try {
        if (!storage) return keys;
        for (var i = 0; i < storage.length; i += 1) {
          var key = storage.key(i);
          if (key && key.indexOf(SETUP_FAILED_PREFIX) === 0) keys.push(key);
        }
      } catch (_) {}
      return keys;
    }

    // Only a password sign-in (signedIn(), directly or via the server's
    // sign-in cookie) calls this. The uid is not known at that moment, so
    // every pending failure on this device is proved; a different person's
    // pending failure needs that person's own password to come back anyway.
    function provePendingSetupFailures() {
      try {
        setupFailedKeys().forEach(function (key) { if (storage.getItem(key) === 'pending') storage.setItem(key, 'proved'); });
      } catch (_) {}
    }

    function setupProved(uid) {
      try { return !!(storage && storage.getItem(setupFailedKey(uid)) === 'proved'); } catch (_) { return false; }
    }

    function setupPendingFor(uid) {
      try { return !!(storage && storage.getItem(setupFailedKey(uid)) === 'pending'); } catch (_) { return false; }
    }

    // Any person's failure on this device still waiting for a password. Read
    // at head time, before the signed-in marker (and so the uid) exists.
    function anySetupPending() {
      try { return setupFailedKeys().some(function (key) { return storage.getItem(key) === 'pending'; }); } catch (_) { return false; }
    }

    // The stored state, not this call's own history: true while the page's
    // person, in a required app with no Face ID record, has no live password
    // proof. Every visible, pageshow and storage decision reads this, so a
    // proof that another page or tab already put back to "pending" asks here
    // too (expireStaleProofs() only reports the proofs it expired itself).
    function proofNeeded() {
      try {
        var data = markerData();
        return !!(data && data.required && setupFailureFallback === 'password' && !setupProved(data.uid));
      } catch (_) { return false; }
    }

    // The password proof's 60-minute timer. Once this device has been away
    // LOCK_GRACE_MS (awayTooLong()), every "proved" goes back to "pending",
    // written down, not just read as expired: "seen" keeps being refreshed
    // while the required sheet is up (the 30-second tick, a visible
    // activity()), and a proof that was only treated as expired would then
    // look fresh again on the next page or reload. Always called before
    // anything refreshes "seen" (head time, boot(), a visible activity(),
    // the tick after a sleep, and hiddenSeen() on a hidden activity() or a
    // pagehide), so the time away is judged first. Returns
    // true when it put anything back to "pending": only boot() uses that,
    // to hide at once. Whether to ask is decided by proofNeeded(), from
    // what is stored.
    function expireStaleProofs() {
      try {
        if (!awayTooLong()) return false;
        var expired = false;
        setupFailedKeys().forEach(function (key) {
          if (storage.getItem(key) === 'proved') { storage.setItem(key, 'pending'); expired = true; }
        });
        return expired;
      } catch (_) { return false; }
    }

    function seenNow() {
      try { if (!isPublicPage() && storage) storage.setItem('mo-lock:seen', String(Date.now())); } catch (_) {}
    }

    function seenAt() {
      try { return storage ? Number(storage.getItem('mo-lock:seen') || 0) : 0; } catch (_) { return 0; }
    }

    function clearSeen() {
      try { if (storage) storage.removeItem('mo-lock:seen'); } catch (_) {}
    }

    // True once LOCK_GRACE_MS or more has passed since "seen", or when "seen"
    // is still in the future. A clock wound backwards makes "now - seen"
    // negative, which would always pass the timer, so a seen timestamp in
    // the future is itself proof this device needs to re-prove who is
    // holding it. No "seen" at all counts as away.
    // Known limit of any timer kept on the device's own clock: a clock wound
    // back by LESS than the time away is not caught. Away 61 minutes, then
    // the clock set back 60, leaves "seen" one minute in the past, so the
    // page opens with no prompt. Only a clock set back past "seen" is caught.
    function awayTooLong() {
      try {
        var seen = seenAt();
        var now = Date.now();
        return now < seen || now - seen >= LOCK_GRACE_MS;
      } catch (_) { return false; }
    }

    function toBytes(value) {
      try {
        var text = String(value).replace(/-/g, '+').replace(/_/g, '/');
        while (text.length % 4) text += '=';
        var binary = atob(text);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return bytes;
      } catch (_) {
        return new Uint8Array(0);
      }
    }

    function fromBytes(bytes) {
      try {
        var binary = '';
        for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      } catch (_) {
        return '';
      }
    }

    function randomBytes(size) {
      try {
        var bytes = new Uint8Array(size);
        if (!window.crypto || !window.crypto.getRandomValues) return null;
        window.crypto.getRandomValues(bytes);
        return bytes;
      } catch (_) {
        return null;
      }
    }

    function label() {
      try {
        var ua = navigator.userAgent || '';
        var platform = navigator.platform || '';
        if (/iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)) return text('face');
        if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return text('touch');
        if (/Android/i.test(ua)) return text('biometric');
        if (/Win/i.test(platform) || /Windows/i.test(ua)) return text('hello');
        return text('screen');
      } catch (_) {
        return text('screen');
      }
    }

    function coarse() {
      try { return window.matchMedia('(pointer: coarse)').matches; } catch (_) { return false; }
    }

    function marker(selector) {
      try { return document.querySelector(selector); } catch (_) { return null; }
    }

    function markerData() {
      var el = marker('[data-mo-lock-user]');
      if (!el) return null;
      try {
        return {
          uid: el.dataset.moLockUser || '',
          app: el.dataset.moLockApp || 'MultiplyOS',
          signout: el.dataset.moLockSignout || '/login',
          required: el.dataset.moLockRequired === 'true'
        };
      } catch (_) { return null; }
    }

    // One timer for every record: a graceMin a record was saved with (5, by
    // an earlier kit) is ignored.
    function lockedFor(record) {
      try {
        if (!record || !record.active) return false;
        return awayTooLong();
      } catch (_) { return false; }
    }

    function injectStyle() {
      try {
        if (isPublicPage()) return;
        if (document.getElementById('mo-lock-style')) return;
        var style = document.createElement('style');
        style.id = 'mo-lock-style';
        style.textContent = 'html[data-mo-locked] body > *:not(#mo-lock){visibility:hidden!important}' +
          'html[data-mo-setup-pending] body > *:not(#mo-lock-sheet):not(#mo-lock-backdrop){visibility:hidden!important}' +
          '.mo-lock-overlay{position:fixed;inset:0;z-index:2147483000;background:var(--mo-page,#fff);color:var(--mo-ink,#0B1320);font:calc(16px * var(--mos-ts, 1)) Inter,system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;height:100dvh;padding:24px;padding-top:calc(24px + env(safe-area-inset-top));padding-bottom:calc(24px + env(safe-area-inset-bottom));box-sizing:border-box}' +
          '.mo-lock-content{width:100%;max-width:360px;text-align:center}' +
          '.mo-lock-icon{width:72px;height:72px;border-radius:16px;object-fit:cover;margin:0 auto 24px;display:block}' +
          '.mo-lock-heading{font-size:calc(22px * var(--mos-ts, 1));line-height:1.25;font-weight:600;margin:0 0 24px}' +
          '.mo-lock-button{appearance:none;border:0;background:var(--mo-btn-fill,#0B1320);color:var(--mo-btn-ink,#fff);border-radius:999px;min-height:48px;width:100%;font:600 calc(17px * var(--mos-ts, 1))/1.2 Inter,system-ui,-apple-system,sans-serif;cursor:pointer;animation:mo-lock-pulse 2s ease-in-out infinite}' +
          '.mo-lock-text-button{appearance:none;border:0;background:transparent;color:var(--mo-ink,#0B1320);text-decoration:underline;min-height:44px;padding:8px 12px;font:calc(16px * var(--mos-ts, 1)) Inter,system-ui,-apple-system,sans-serif;cursor:pointer}' +
          '.mo-lock-error{font-size:calc(14px * var(--mos-ts, 1));line-height:1.4;min-height:20px;margin:10px 0 0;color:var(--mo-ink,#0B1320)}' +
          '.mo-lock-backdrop{position:fixed;inset:0;z-index:2147482998;background:rgba(11,19,32,.4)}' +
          '.mo-lock-backdrop-required{background:var(--mo-page,#fff)}' +
          '.mo-lock-sheet{position:fixed;z-index:2147482999;left:0;right:0;bottom:0;background:var(--mo-card,#fff);color:var(--mo-ink,#0B1320);border-radius:20px 20px 0 0;box-shadow:0 -8px 32px rgba(11,19,32,.18);padding:24px;padding-bottom:calc(24px + env(safe-area-inset-bottom));font:calc(16px * var(--mos-ts, 1)) Inter,system-ui,-apple-system,sans-serif;box-sizing:border-box}' +
          '.mo-lock-sheet-inner{max-width:520px;margin:0 auto}' +
          '.mo-lock-sheet .mo-lock-heading{margin-bottom:12px}' +
          '.mo-lock-copy{font-size:calc(16px * var(--mos-ts, 1));line-height:1.45;margin:0 0 20px}' +
          '.mo-lock-switch-row{display:flex;align-items:center;gap:12px;font-size:calc(16px * var(--mos-ts, 1));line-height:1.35;margin:8px 0;min-height:48px}' +
          '.mo-lock-switch-row.mo-lock-row-tap{cursor:pointer}' +
          '.mo-lock-switch{appearance:none;width:52px;height:32px;flex:0 0 52px;border:0;border-radius:999px;background:var(--mo-line,#CBD5E1);padding:3px;cursor:pointer;text-align:left}' +
          '.mo-lock-switch:after{content:"";display:block;width:26px;height:26px;border-radius:50%;background:var(--mo-card,#fff);transition:transform .15s ease}' +
          '.mo-lock-switch[aria-checked="true"]{background:var(--mo-btn-fill,#0B1320)}' +
          '.mo-lock-switch[aria-checked="true"]:after{transform:translateX(20px)}' +
          '.mo-lock-toggle-copy{flex:1}' +
          '.mo-lock-toggle-turnon{appearance:none;border:0;flex:0 0 auto;background:var(--mo-btn-fill,#0B1320);color:var(--mo-btn-ink,#fff);border-radius:999px;min-height:44px;padding:0 16px;font:600 calc(16px * var(--mos-ts, 1))/1.2 Inter,system-ui,-apple-system,sans-serif;cursor:pointer}' +
          '.mo-lock-button:focus-visible,.mo-lock-text-button:focus-visible,.mo-lock-switch:focus-visible,.mo-lock-toggle-turnon:focus-visible{outline:3px solid var(--mo-accent,#1D4ED8);outline-offset:3px}' +
          '@keyframes mo-lock-pulse{0%,100%{box-shadow:0 0 0 0 rgba(29,78,216,.16)}50%{box-shadow:0 0 0 7px rgba(29,78,216,.08)}}' +
          '@media(pointer:coarse){.mo-lock-text-button{min-height:48px}.mo-lock-toggle-turnon{min-height:48px}}' +
          '@media(prefers-reduced-motion:reduce){.mo-lock-button{animation:none}.mo-lock-switch:after{transition:none}}';
        (document.head || document.documentElement).appendChild(style);
      } catch (_) {}
    }

    function focusLater(el) {
      try { window.setTimeout(function () { try { el.focus(); } catch (_) {} }, 0); } catch (_) {}
    }

    function inertBody(value) {
      try {
        if (!document.body) return;
        Array.prototype.forEach.call(document.body.children, function (child) {
          if (child.id !== 'mo-lock' && child.id !== 'mo-lock-sheet' && child.id !== 'mo-lock-backdrop') child.inert = value;
        });
      } catch (_) {}
    }

    function removeOverlay() {
      try {
        var old = document.getElementById('mo-lock');
        if (old) old.remove();
        overlayBuilt = false;
        inertBody(false);
      } catch (_) {}
    }

    function showUnlockError(button) {
      try { var error = button.parentNode.querySelector('.mo-lock-error'); if (error) error.textContent = text('unlockError'); } catch (_) {}
    }

    function unlock(button, automatic) {
      try {
        if (isPublicPage()) { clearPublicUi(); return; }
        var record = readRecord();
        if (!record || !availableBase()) return;
        var challenge = randomBytes(32);
        var id = toBytes(record.credId);
        if (!challenge || !id.length) return;
        navigator.credentials.get({ publicKey: { challenge: challenge, allowCredentials: [{ type: 'public-key', id: id, transports: ['internal', 'hybrid'] }], userVerification: 'required', timeout: 60000 } }).then(function () {
          try { removeOverlay(); root.removeAttribute('data-mo-locked'); seenNow(); } catch (_) {}
        }, function () { if (!automatic) showUnlockError(button); });
      } catch (_) {}
    }

    function signOutInstead(destinationOverride) {
      try {
        if (isPublicPage()) { clearPublicUi(); return; }
        var record = readRecord();
        var destination = destinationOverride || (record && record.signout) || '/login';
        // Only navigate. The record and "seen" stay exactly as they are: this
        // runs before the server has signed anyone out, and if that
        // navigation never lands (airplane mode, a dead connection) the
        // session survives — deleting the record here would have left a
        // signed-in phone with no lock at all. The record goes when a
        // different person signs in on this device (boot() deletes it on a uid
        // change) or when the app's own sign-out calls clear(); the same
        // person's password sign-in refreshes "seen" through signedIn().
        //
        // The session cookies are deliberately left alone too. Wiping the
        // sb-*-auth-token cookies client-side, before the navigation, meant
        // the sign-out route's own GET arrived with no session to sign out —
        // scope: 'local' had nothing to revoke, so the refresh token outlived
        // this "sign out". A real navigation to the server route lets it read
        // the still-live session, revoke it, and clear the cookies itself.
        try { if (window.sessionStorage) window.sessionStorage.setItem('mo-lock:signout-at', String(Date.now())); } catch (_) {}
        location.replace(destination);
      } catch (_) {}
    }

    function buildOverlay() {
      try {
        if (isPublicPage()) { clearPublicUi(); return; }
        var data = markerData();
        var record = readRecord();
        if (!document.body || !record || !record.active || document.getElementById('mo-lock') || !root.matches('[data-mo-locked]')) return;
        current = data || { app: record.app };
        var overlay = document.createElement('div');
        overlay.id = 'mo-lock';
        overlay.className = 'mo-lock-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'mo-lock-heading');
        var content = document.createElement('div');
        content.className = 'mo-lock-content';
        var icon = document.querySelector('link[rel="apple-touch-icon"]');
        if (icon && icon.href) { var image = document.createElement('img'); image.className = 'mo-lock-icon'; image.src = icon.href; image.alt = ''; content.appendChild(image); }
        var heading = document.createElement('h1'); heading.id = 'mo-lock-heading'; heading.className = 'mo-lock-heading'; heading.textContent = text('locked', { app: current.app }); content.appendChild(heading);
        var button = document.createElement('button'); button.type = 'button'; button.className = 'mo-lock-button'; button.textContent = text('openWith', { platform: label() }); content.appendChild(button);
        var error = document.createElement('div'); error.className = 'mo-lock-error'; error.setAttribute('role', 'alert'); content.appendChild(error);
        var password = document.createElement('button'); password.type = 'button'; password.className = 'mo-lock-text-button'; password.textContent = text('password'); password.addEventListener('click', function () { signOutInstead(); }); content.appendChild(password);
        button.addEventListener('click', function () { unlock(button, false); });
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        overlayBuilt = true;
        inertBody(true);
        focusLater(button);
      } catch (_) {}
    }

    function closeSheet() {
      try {
        var sheet = document.getElementById('mo-lock-sheet'); if (sheet) sheet.remove();
        var backdrop = document.getElementById('mo-lock-backdrop'); if (backdrop) backdrop.remove();
        inertBody(false);
        clearSetupPending();
      } catch (_) {}
    }

    // Clears the "no record yet, required" hide (head time, boot() and
    // askAgain() near the bottom of this file) once boot() or setup() has
    // resolved that state one way or another — a record now exists, a live
    // password proof, the sheet was dismissed, a page with no signed-in
    // marker, or this device has no biometrics at all to ask for. Never
    // leave the page hidden with nothing left running that will show it
    // again.
    function clearSetupPending() { try { root.removeAttribute('data-mo-setup-pending'); } catch (_) {} }

    function setup(recordData, fromToggle) {
      try {
        if (isPublicPage()) { clearPublicUi(); return; }
        if (!recordData) return;
        if (fromToggle) { setupShown = false; closeSheet(); }
        if (setupShown || document.getElementById('mo-lock-sheet')) return;
        setupShown = true;
        platformAvailable().then(function (isAvailable) {
          try {
            if (!isAvailable) { clearSetupPending(); return; }
            if (readRecord()) { clearSetupPending(); return; }
            // One sheet at a time. A second boot() while this check was still
            // waiting (the page streaming in, DOMContentLoaded) reset
            // setupShown and asked again, and both answers built a sheet:
            // closeSheet() then removed only one, and the other stayed over
            // the page after Face ID was already on.
            if (document.getElementById('mo-lock-sheet')) return;
            if (!fromToggle && !recordData.required) {
              try { if (storage && storage.getItem('mo-lock:skip:' + recordData.uid) === '1') { clearSetupPending(); return; } } catch (_) {}
            }
            var backdrop = document.createElement('div'); backdrop.id = 'mo-lock-backdrop'; backdrop.className = 'mo-lock-backdrop' + (recordData.required ? ' mo-lock-backdrop-required' : '');
            var sheet = document.createElement('div'); sheet.id = 'mo-lock-sheet'; sheet.className = 'mo-lock-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'mo-lock-sheet-heading');
            var inner = document.createElement('div'); inner.className = 'mo-lock-sheet-inner';
            if (isPublicPage()) { clearPublicUi(); return; }
            var heading = document.createElement('h2'); heading.id = 'mo-lock-sheet-heading'; heading.className = 'mo-lock-heading'; heading.textContent = text('setupHeading', { app: recordData.app, platform: label() }); inner.appendChild(heading);
            var copy = document.createElement('p'); copy.className = 'mo-lock-copy'; copy.textContent = text('setupCopy', { app: recordData.app }) + (recordData.required ? ' ' + text('requiredCopy', { app: recordData.app }) : ''); inner.appendChild(copy);
            var button = document.createElement('button'); button.type = 'button'; button.className = 'mo-lock-button'; button.textContent = text('turnOn', { platform: label() }); inner.appendChild(button);
            var error = document.createElement('div'); error.className = 'mo-lock-error'; error.setAttribute('role', 'alert'); inner.appendChild(error);
            // Required mode has no skip. The way on when Face ID/passkey setup
            // fails, is cancelled, or the device has no biometrics is the
            // account password — never "Continue for now" — so this button is
            // visible from the start, not only after a failure: a person who
            // cancels the system prompt closes the sheet without ever
            // triggering an error at all, and must still have a plain way out.
            if (recordData.required) {
              var password = document.createElement('button'); password.type = 'button'; password.className = 'mo-lock-text-button'; password.textContent = text('password');
              password.addEventListener('click', function () { signOutInstead(recordData.signout); });
              inner.appendChild(password);
            } else {
              var later = document.createElement('button'); later.type = 'button'; later.className = 'mo-lock-text-button'; later.textContent = text('later'); later.addEventListener('click', function () { try { if (isPublicPage()) { clearPublicUi(); return; } storage.setItem('mo-lock:skip:' + recordData.uid, '1'); } catch (_) {} closeSheet(); }); inner.appendChild(later);
            }
            button.addEventListener('click', function () {
              try {
                if (isPublicPage()) { clearPublicUi(); return; }
                var userId = randomBytes(16); var challenge = randomBytes(32);
                if (!userId || !challenge) throw new Error('randomness unavailable');
                navigator.credentials.create({ publicKey: { rp: { name: 'MultiplyOS' }, user: { id: userId, name: recordData.app + ' on this device', displayName: recordData.app + ' lock' }, challenge: challenge, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000, attestation: 'none' } }).then(function (credential) {
                  try { if (isPublicPage()) { clearPublicUi(); return; } writeRecord({ credId: fromBytes(new Uint8Array(credential.rawId)), uid: recordData.uid, app: recordData.app, signout: recordData.signout, active: true }); seenNow(); closeSheet(); refreshToggles(); } catch (_) {}
                }, function () {
                  try {
                    // A device that reports Face ID/passkeys as available but
                    // can never actually save one (iCloud Keychain off, a
                    // managed phone blocking passkeys) must not loop this
                    // person through turn-on -> fail -> sign out -> sign in ->
                    // turn-on forever. One failure in required mode is enough
                    // to say so plainly. It is only recorded as "pending":
                    // the sheet stays until the person signs in with their
                    // password, which proves it until this device has been
                    // away LOCK_GRACE_MS — see setupFailureFallback above.
                    if (recordData.required && setupFailureFallback === 'password') {
                      markSetupFailed(recordData.uid);
                      error.textContent = text('setupBlockedCopy', { app: recordData.app, platform: label(), turnOn: text('turnOn', { platform: label() }), password: text('password') });
                    } else {
                      error.textContent = text(recordData.required ? 'unlockError' : 'setupError');
                    }
                  } catch (_) {}
                });
              } catch (_) { try { error.textContent = text(recordData.required ? 'unlockError' : 'setupError'); } catch (_) {} }
            });
            sheet.appendChild(inner); document.body.appendChild(backdrop); document.body.appendChild(sheet); focusLater(button);
            if (recordData.required) inertBody(true);
            // "No skip" governs the buttons above, not this keyboard shortcut
            // on desktop — Escape closing a required sheet was the same
            // bypass with an extra step, so it is ignored while required.
            sheet.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !recordData.required) closeSheet(); });
          } catch (_) {}
        });
      } catch (_) {}
    }

    function turnOff() { try { if (isPublicPage()) { clearPublicUi(); return; } deleteRecord(); clearSeen(); refreshToggles(); } catch (_) {} }

    function turnOn(data) {
      try { if (isPublicPage()) { clearPublicUi(); return; } setup(data, true); } catch (_) {}
    }

    function renderToggle(host, data) {
      try {
        if (host.getAttribute('data-mo-lock-rendered') === '1') return;
        host.setAttribute('data-mo-lock-rendered', '1');
        var row = document.createElement('div'); row.className = 'mo-lock-switch-row';
        var copy = document.createElement('span'); copy.className = 'mo-lock-toggle-copy'; row.appendChild(copy);
        // Required means no off switch: turnOff() does not check required, so
        // a switch here would undo "no skip" with one tap. The row's other
        // control (a plain state line, or a Turn on button) is built in
        // refreshToggle so it can also change when the record itself changes.
        if (!(data && data.required)) {
          row.classList.add('mo-lock-row-tap');
          var button = document.createElement('button'); button.type = 'button'; button.className = 'mo-lock-switch'; button.setAttribute('role', 'switch');
          button.addEventListener('click', function () { var record = readRecord(); if (record && record.active) turnOff(); else { var currentData = markerData() || data; if (currentData) turnOn(currentData); } });
          row.appendChild(button);
          // The whole row is the tap target (RULES-CARD §14: 48px on touch) —
          // the switch alone was 52x32 and its label text could not be tapped.
          row.addEventListener('click', function (event) { if (event.target !== button) button.click(); });
        }
        host.appendChild(row);
        refreshToggle(host, data);
        platformAvailable().then(function (isAvailable) { try { if (!isAvailable && !isPublicPage()) { host.textContent = ''; host.setAttribute('data-mo-lock-rendered', '1'); var noBiometric = document.createElement('span'); noBiometric.className = 'mo-lock-toggle-copy'; noBiometric.textContent = text('noBiometric'); host.appendChild(noBiometric); } } catch (_) {} });
      } catch (_) {}
    }

    function refreshToggle(host, data) {
      try {
        var row = host.querySelector('.mo-lock-switch-row');
        if (!row) return;
        var copy = row.querySelector('.mo-lock-toggle-copy');
        if (!copy) return;
        var record = readRecord();
        var currentData = markerData() || data;
        var appName = currentData ? currentData.app : text('thisApp');
        if (currentData && currentData.required) {
          // Required mode shows state instead of a switch: on with the
          // record active, or a Turn on button when it is not, so a
          // volunteer can always tell whether this device is protected.
          var turnOnButton = row.querySelector('.mo-lock-toggle-turnon');
          if (record && record.active) {
            copy.textContent = text('requiredOn', { platform: label(), app: appName });
            if (turnOnButton) turnOnButton.remove();
            row.classList.remove('mo-lock-row-tap');
          } else {
            copy.textContent = text('toggle', { platform: label(), app: appName });
            if (!turnOnButton) {
              turnOnButton = document.createElement('button'); turnOnButton.type = 'button'; turnOnButton.className = 'mo-lock-toggle-turnon';
              turnOnButton.addEventListener('click', function () { var latestData = markerData() || data; if (latestData) turnOn(latestData); });
              row.appendChild(turnOnButton);
            }
            turnOnButton.textContent = text('turnOn', { platform: label() });
            row.classList.add('mo-lock-row-tap');
          }
        } else {
          copy.textContent = text('toggle', { platform: label(), app: appName });
          var switchButton = row.querySelector('.mo-lock-switch');
          if (switchButton) {
            switchButton.setAttribute('aria-label', copy.textContent);
            switchButton.setAttribute('aria-checked', record && record.active ? 'true' : 'false');
          }
        }
      } catch (_) {}
    }

    function renderToggles() {
      try {
        if (isPublicPage()) { clearPublicUi(); return; }
        var nodes = document.querySelectorAll('[data-mo-lock-toggle]');
        nodes.forEach(function (host) {
          renderToggle(host, markerData());
        });
      } catch (_) {}
    }

    function refreshToggles() {
      try {
        if (isPublicPage()) { clearPublicUi(); return; }
        document.querySelectorAll('[data-mo-lock-toggle][data-mo-lock-rendered="1"]').forEach(function (host) { refreshToggle(host, markerData()); });
      } catch (_) {}
    }

    function clear() {
      try {
        if (isPublicPage()) { clearPublicUi(); return; }
        deleteRecord(); clearSeen();
        // With "seen" gone this device counts as away: a signed-out
        // device's password proof ends here, not an hour from now.
        expireStaleProofs();
        removeOverlay(); root.removeAttribute('data-mo-locked'); clearSetupPending(); refreshToggles();
      } catch (_) {}
    }

    function lock() { try { if (isPublicPage()) { clearPublicUi(); return; } var record = readRecord(); if (availableBase() && record && record.active) { root.dataset.moLocked = 'true'; buildOverlay(); } } catch (_) {} }

    function isOn() { try { if (isPublicPage()) return false; var record = readRecord(); return !!(record && record.active); } catch (_) { return false; } }

    /**
     * Called by the app's OWN password sign-in success handler, at the moment a
     * password has just been verified — proof of identity the lock can trust.
     * A mere visit to the sign-in page must never do this on its own (see the
     * seenNow() guards below); only an explicit call right after a real
     * successful sign-in may, so a person who just typed their password is not
     * asked for Face ID again the instant the next page loads.
     */
    function signedIn() {
      try { if (!isPublicPage()) seenNow(); } catch (_) {}
      // The one place a failed Face ID setup becomes "proved" (see
      // setupFailureFallback): a password was just accepted in this tab.
      provePendingSetupFailures();
    }

    // Accepts only a millisecond timestamp within 12 hours of this device's
    // clock, either side. The value is the SERVER's Date.now(), so this
    // compares two clocks: a phone set by hand a few minutes off would fail
    // any tight window on every sign-in, and on a phone that cannot save Face
    // ID that is a setup-sheet loop with no way out. Freshness comes from
    // elsewhere: the browser drops the cookie Max-Age=60 after it arrived, on
    // its own clock, and consumeSignInMarker() deletes every copy on first
    // read, so a leftover can never be replayed. What this still rejects: a
    // non-timestamp ("1"), and a value so far off that no real sign-in wrote
    // it.
    function signInCookieFresh(value) {
      try {
        if (!/^[0-9]{1,16}$/.test(String(value))) return false;
        var at = Number(value);
        if (!isFinite(at) || at <= 0) return false;
        var age = Date.now() - at;
        return age <= SIGNIN_COOKIE_SANITY_MS && age >= -SIGNIN_COOKIE_SANITY_MS;
      } catch (_) { return false; }
    }

    // Deletes the host-only form and every Domain= form from this host up to
    // (not including) its top-level label: connect.futures.church clears
    // Domain=connect.futures.church and Domain=futures.church too. A copy set
    // on a parent domain by a sibling origin is not removed by a host-only
    // delete. The browser ignores a delete on a public suffix (netlify.app).
    function deleteSignInCookie() {
      try {
        var expired = SIGNIN_COOKIE + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        document.cookie = expired;
        var host = location.hostname || '';
        if (!host || host.indexOf(':') !== -1 || /^[0-9.]+$/.test(host)) return;
        var labels = host.split('.');
        for (var i = 0; i < labels.length - 1; i += 1) document.cookie = expired + '; domain=' + labels.slice(i).join('.');
      } catch (_) {}
    }

    /**
     * Consumes the one-shot, JS-readable cookie an app's server sets right
     * before its sign-in redirects: HR and Heartbeat's CG Connect door sign
     * in via redirect() (a soft push inside the same document), and
     * Heartbeat's staff /api/auth/login answers with a 302. Runs at head
     * time (so a hard navigation is not locked before boot() gets here) and
     * on every private boot(); a no-op when the cookie is not there. Deletes
     * every copy immediately so a later Back/Forward — which proves nothing
     * new — cannot replay it, and honours it only if its timestamp value is
     * fresh (signInCookieFresh).
     */
    function consumeSignInMarker() {
      try {
        if (!document.cookie) return;
        var parts = document.cookie.split(';');
        var found = false;
        var fresh = false;
        for (var i = 0; i < parts.length; i += 1) {
          var eq = parts[i].indexOf('=');
          var name = (eq === -1 ? parts[i] : parts[i].slice(0, eq)).trim();
          if (name !== SIGNIN_COOKIE) continue;
          found = true;
          var value = eq === -1 ? '' : parts[i].slice(eq + 1).trim();
          try { value = decodeURIComponent(value); } catch (_) {}
          if (signInCookieFresh(value)) fresh = true;
        }
        if (!found) return;
        deleteSignInCookie();
        if (fresh) signedIn();
      } catch (_) {}
    }

    injectStyle();
    // A fresh open judges the time away first, before anything in this
    // document can refresh "seen": a password proof older than
    // LOCK_GRACE_MS goes back to "pending" here.
    if (!isPublicPage()) expireStaleProofs();
    // Before the head-time lock below: a server sign-in that answered with a
    // full navigation (Heartbeat's staff /api/auth/login 302) would otherwise
    // be locked here, before boot() ever reads the cookie.
    if (!isPublicPage()) consumeSignInMarker();
    var initial = isPublicPage() ? null : readRecord();
    if (!isPublicPage() && availableBase() && lockedFor(initial)) root.dataset.moLocked = 'true';
    // Required mode, no record yet: Safari can drop localStorage after seven
    // tab-only days while the Supabase session cookie survives (middleware
    // re-sets it), so a signed-in page could otherwise paint in full before
    // boot() ever runs and shows the setup sheet. scriptRequired repeats
    // "required" on the script tag itself because the signed-in marker every
    // other check reads lives in <body>, which does not exist yet during this
    // synchronous <head> script. A failure still waiting for a password
    // hides too, even with "seen" fresh: another tab's sheet keeps "seen"
    // fresh, and a new tab or a hard navigation would otherwise paint
    // people's details until boot() had built its own sheet.
    else if (!isPublicPage() && availableBase() && scriptRequired && !initial && (awayTooLong() || anySetupPending())) {
      root.setAttribute('data-mo-setup-pending', 'true');
    }
    window.MOLock = { clear: clear, lock: lock, isOn: isOn, signedIn: signedIn, available: availableBase() };

    function boot() {
      try {
        var isPublic = isPublicPage();
        // Client-side navigation from a public page straight into a private
        // one used to skip the lock entirely: data-mo-locked is only ever set
        // at head time and on visibilitychange/pageshow, and this observer's
        // own MutationObserver mutations are filtered out below, so a
        // pushState from a public path was never re-checked. A departure from
        // the sign-in page is deliberately NOT covered by this (isPublicPage()
        // is false there), so a fresh password is never immediately followed
        // by a Face ID prompt.
        var enteringFromPublic = lastPageWasPublic && !isPublic;
        lastPageWasPublic = isPublic;
        if (isPublic) { clearPublicUi(); return; }
        initStorage();
        injectStyle();
        if (!availableBase()) return;
        var signIn = marker('[data-mo-lock-signin]');
        if (signIn) {
          if (!signInSeen || document.getElementById('mo-lock') || root.matches('[data-mo-locked]')) { closeSheet(); removeOverlay(); root.removeAttribute('data-mo-locked'); }
          signInSeen = true;
          // Closing the sheet above (or the no-op when it was already closed)
          // must not leave this true: a required sheet dismissed by landing
          // on /signin has to be free to come back on the way out, the same
          // as the overlay is.
          setupShown = false;
          lastPageWasSignIn = true;
          clearSetupPending();
          return;
        }
        // A departure FROM the sign-in page is the one soft navigation the
        // rest of this function does not otherwise re-check: the branch
        // above always drops data-mo-locked and the setup sheet so a fresh
        // password is never immediately followed by a Face ID prompt, but a
        // person who only revisited /signin via Back — proving nothing new —
        // must not carry that same clean slate Forward again.
        // consumeSignInMarker() below runs first, so a genuine fresh sign-in
        // (HR, Heartbeat's CG Connect door) still lands unlocked: the
        // server-set marker refreshes "seen" before lockedFor() is checked.
        var enteringFromSignIn = lastPageWasSignIn;
        lastPageWasSignIn = false;
        signInSeen = false;
        consumeSignInMarker();
        // After the sign-in cookie (a fresh password proves again) and
        // before the proof is read below. Also covers Forward off the
        // sign-in page, which never refreshes "seen": an hour spent there
        // proves nothing.
        var proofExpired = expireStaleProofs();
        var data = markerData();
        if (data) {
          var record = readRecord();
          // A different person on this device (a shared phone): drop the
          // previous person's record and "seen". Keep "seen" only when this
          // person already holds a live password proof of their own (the
          // branch below honours it): expireStaleProofs() above has already
          // put a proof older than the hour back to "pending", and dropping
          // "seen" here would make the 30-second tick expire this person's
          // fresh proof and ask for the password again (review case H).
          // Proofs are per uid, so nobody passes on another person's proof.
          if (record && record.uid !== data.uid) {
            deleteRecord(); record = null;
            if (!(data.required && setupFailureFallback === 'password' && setupProved(data.uid))) clearSeen();
          }
          if (record) {
            clearSetupPending();
            var changed = false;
            if (record.app !== data.app) { record.app = data.app; changed = true; }
            if (record.signout !== data.signout) { record.signout = data.signout; changed = true; }
            if (changed) writeRecord(record);
          } else if (data.required && setupFailureFallback === 'password' && setupProved(data.uid)) {
            // This device already failed to save a passkey AND the person
            // signed in with their password afterwards (the flag is only
            // "proved" once signedIn() has run; a failure on its own leaves
            // it "pending", which lands in the branch below and shows the
            // sheet again). Do not ask again until this device has been
            // away LOCK_GRACE_MS (expireStaleProofs() above).
            clearSetupPending();
          } else {
            // No record and no live proof: hide the page now, the way lock()
            // does for a record, instead of waiting for the sheet to build —
            // whenever the sheet is known to follow: a proof that just ran
            // out, this person's failure still waiting for a password, or a
            // device this document already found can save Face ID. Not on a
            // device where that is still unknown and nothing was ever tried:
            // a desktop with no fingerprint or face would blank for a moment
            // on every page and then show it again with no sheet at all.
            if (data.required && (proofExpired || setupPendingFor(data.uid) || platformOk === true)) root.setAttribute('data-mo-setup-pending', 'true');
            // A sheet the person already saw can disappear from the DOM
            // without ever being dismissed through this script (NOTES flags
            // a full client-side remount as an open risk). required mode has
            // no skip, so if it is gone and there is still no record, the
            // next boot() must be free to rebuild it rather than trust a
            // setupShown flag left over from the page that disappeared.
            if (data.required && setupShown && !document.getElementById('mo-lock-sheet')) setupShown = false;
            setup(data);
          }
          if (lastMarkerUid !== data.uid) lastMarkerUid = data.uid;
          renderToggles();
        } else {
          if (lastMarkerUid !== null) lastMarkerUid = null;
          // No signed-in shell on this page (/password, /auth/set-password,
          // /no-access, not-found, error pages): there are no people's details
          // here to hide and no uid to build a setup sheet for, so nothing
          // else would ever lift the head-time hide — a brand-new volunteer
          // on /password would be left on a blank page for good. Wait for the
          // document to finish parsing first: the MutationObserver calls
          // boot() while the body is still streaming in, before the marker
          // has arrived.
          if (domParsed || document.readyState !== 'loading') clearSetupPending();
        }
        if (enteringFromPublic) {
          var enteringRecord = readRecord();
          if (enteringRecord && lockedFor(enteringRecord)) lock();
        }
        if (enteringFromSignIn) {
          var enteringRecord2 = readRecord();
          if (enteringRecord2 && lockedFor(enteringRecord2)) lock();
        }
        if (root.matches('[data-mo-locked]')) buildOverlay();
        if (!data) refreshToggles();
      } catch (_) {}
    }

    // A phone that cannot save Face ID, shown again after LOCK_GRACE_MS
    // away: its password proof has just gone back to "pending". Hide the page
    // now, as lock() does for a record, and bring the required sheet back
    // with its same two buttons: "Turn on" (this phone may be able to save
    // Face ID now) and "Use your password instead". A marker-less page has no
    // uid to ask for; its next page with a marker asks through boot().
    // Idempotent: with the sheet already up it only re-sets the hide.
    function askAgain() {
      try {
        if (isPublicPage() || isSignInPage()) return;
        var data = markerData();
        if (!data || !data.required || setupFailureFallback !== 'password') return;
        root.setAttribute('data-mo-setup-pending', 'true');
        if (!document.getElementById('mo-lock-sheet')) setupShown = false;
        setup(data);
      } catch (_) {}
    }

    // Used by a hidden activity() and by pagehide in place of a bare
    // seenNow(). A tab left hidden LOCK_GRACE_MS or more and then closed from
    // the tab switcher (or its browser quit) gets pagehide, and a device that
    // slept with the page in front can wake to a hidden event before the
    // 30-second tick: refreshing "seen" there would forgive the time away,
    // and the next open would find "seen" fresh. So judge the time away
    // first: past the timer, expire the proofs and lock (Face ID) or ask
    // again (password), and leave "seen" stale for the next open to judge.
    function hiddenSeen() {
      try {
        if (awayTooLong()) {
          expireStaleProofs();
          var record = readRecord();
          if (record && lockedFor(record)) lock();
          else if (!record && proofNeeded()) askAgain();
          return;
        }
        seenNow();
      } catch (_) {}
    }

    function activity() {
      try {
        if (isPublicPage()) { clearPublicUi(); return; }
        // A sign-in-marked page must never refresh "seen" on its own — that is
        // what let a device that was still signed in (just not freshly proved)
        // sit on /login and stay unlocked on every page after it. Only an
        // explicit signedIn() call, from a real sign-in success, may do that.
        if (isSignInPage()) return;
        if (document.visibilityState === 'visible') {
          // Judge the time away before seenNow() below forgives it.
          expireStaleProofs();
          var record = readRecord();
          if (record && lockedFor(record)) lock();
          else {
            // From the stored state, not from whether this call did the
            // expiring: a second tab, or a page restored by Back from the
            // back-forward cache, finds the proof already "pending" (another
            // page expired it, and that page's sheet keeps "seen" fresh) and
            // must ask all the same. The sheet stays until a password or Face
            // ID; "seen" below only measures time away from here on.
            if (!record && proofNeeded()) askAgain();
            if (!root.matches('[data-mo-locked]')) seenNow();
          }
        }
        if (document.visibilityState === 'hidden' && !root.matches('[data-mo-locked]')) hiddenSeen();
      } catch (_) {}
    }

    document.addEventListener('DOMContentLoaded', function () { domParsed = true; boot(); });
    document.addEventListener('visibilitychange', activity);
    window.addEventListener('pagehide', function () { try { if (!isPublicPage() && !isSignInPage() && !root.matches('[data-mo-locked]')) hiddenSeen(); } catch (_) {} });
    window.addEventListener('pageshow', function (event) { try { if (event.persisted || isPublicPage()) activity(); } catch (_) {} });
    // While the page is in front, this writes "seen" at most 30 seconds
    // apart, so a gap of LOCK_GRACE_MS or more can only mean the device
    // slept: a laptop shut with the page in front never fires "hidden".
    // Judge that gap (activity() locks, or asks for the password again)
    // before refreshing "seen", never after.
    window.setInterval(function () {
      try {
        if (isPublicPage() || document.visibilityState === 'hidden' || isSignInPage() || root.matches('[data-mo-locked]')) return;
        if (awayTooLong()) activity(); else seenNow();
      } catch (_) {}
    }, 30000);
    // Another tab put a proof back to "pending" (its time away ran out, or
    // the app signed out there): hide this tab now too, not only when it is
    // next brought forward. The event fires in every other same-origin tab,
    // hidden or not, and never in the tab that wrote it.
    window.addEventListener('storage', function (event) {
      try {
        if (!event || typeof event.key !== 'string' || event.key.indexOf(SETUP_FAILED_PREFIX) !== 0 || event.newValue !== 'pending') return;
        if (!readRecord() && proofNeeded()) askAgain();
      } catch (_) {}
    });
    new MutationObserver(function (mutations) {
      try {
        var relevant = mutations.some(function (mutation) {
          try { return !(mutation.target && mutation.target.closest && mutation.target.closest('#mo-lock, #mo-lock-sheet, #mo-lock-backdrop, [data-mo-lock-toggle][data-mo-lock-rendered="1"]')); } catch (_) { return true; }
        });
        if (relevant) boot();
      } catch (_) {}
    }).observe(root, { childList: true, subtree: true });
  } catch (_) {
    /* Face ID is optional and must never stop the page. */
  }
}());
