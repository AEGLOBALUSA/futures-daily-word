/**
 * Email gate modal — onboarding overlay for new users.
 * Three-step profile resolution: PCO lookup → Supabase recall → new registration.
 */
import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { CAMPUSES } from '../data/tokens';
import { API_BASE } from '../utils/api-base';
import { ALL_PERSONAS, PERSONA_CONFIGS } from '../utils/persona-config';
import { t, getLang } from '../utils/i18n';
import { setSessionToken } from '../utils/sessionToken';
import { useModalA11y } from '../utils/useModalA11y';

// i18n keys per persona (persona_* / persona_*_desc exist in all four languages).
const PERSONA_I18N: Record<string, string> = {
  new_to_faith: 'persona_new',
  congregation: 'persona_member',
  deeper_study: 'persona_study',
  pastor_leader: 'persona_leader',
  comfort: 'persona_comfort',
};

const PERSONAS = ALL_PERSONAS.map(id => ({
  id,
  label: PERSONA_CONFIGS[id].label,
  desc: PERSONA_CONFIGS[id].description,
}));

// Read the persona the user already chose, if any. The picker is first-run onboarding
// ONLY — re-showing it on later write actions (New Entry, Add Prayer, change campus) was
// silently overwriting dw_setup.persona on accidental taps.
function readSetupPersona(): string {
  try {
    return JSON.parse(localStorage.getItem('dw_setup') || '{}').persona || '';
  } catch {
    return '';
  }
}

export function EmailGate() {
  const { showEmailGate, setShowEmailGate, saveProfile, saveSetup, emailGateCallback } = useUser();
  const lang = getLang();

  // Open straight to the email step if a persona already exists — never re-present the picker.
  const [step, setStep] = useState<'persona' | 'email' | 'done'>(
    readSetupPersona() ? 'email' : 'persona'
  );
  const [persona, setPersona] = useState(readSetupPersona());
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [campus, setCampus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [_done, setDone] = useState(false);

  // Each time the gate (re)opens for a user who already has a persona, skip past the
  // picker. Guards the re-open case where this component stays mounted between opens.
  useEffect(() => {
    if (showEmailGate && readSetupPersona()) {
      setStep('email');
    }
  }, [showEmailGate]);

  // Dialog semantics: focus in, Tab trap, Escape → skip, focus restore.
  const dialogRef = useModalA11y(showEmailGate, () => handleSkip());

  if (!showEmailGate) return null;

  const handlePersonaSelect = (p: string) => {
    setPersona(p);
    saveSetup({ persona: p, source: 'onboarding' });
    setStep('email');
  };

  const handleSubmit = async () => {
    const trimEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      setError(t('valid_email_error', lang));
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Step 1: Try PCO lookup
      let profile = { firstName: '', lastName: '', email: trimEmail, phone: '', church: '', city: '', campus: '' };

      try {
        const pcoRes = await fetch(`${API_BASE}/api/pco-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync', email: trimEmail }),
        });
        if (pcoRes.ok) {
          const pcoData = await pcoRes.json();
          if (pcoData.person) {
            profile.firstName = pcoData.person.firstName || '';
            profile.lastName = pcoData.person.lastName || '';
            if (pcoData.person.campus) profile.campus = pcoData.person.campus;
          }
        }
      } catch { /* PCO optional */ }

      // Step 2: Try Supabase recall
      try {
        const getRes = await fetch(`${API_BASE}/api/user-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', email: trimEmail }),
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          if (getData.profile) {
            profile = { ...profile, ...getData.profile, email: trimEmail };
          }
          if (getData.sessionToken) {
            setSessionToken(getData.sessionToken);
          }
        }
      } catch { /* continue to register */ }

      // Step 3: Register if new
      const regFirst = firstName.trim() || profile.firstName;
      const regLast = lastName.trim() || profile.lastName;
      const regCampus = campus || profile.campus || '';

      const regRes = await fetch(`${API_BASE}/api/user-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          firstName: regFirst,
          lastName: regLast,
          email: trimEmail,
          campus: regCampus,
          persona: persona,
          lang: localStorage.getItem('dw_lang') || 'en',
        }),
      });
      try {
        const regData = await regRes.json();
        if (regData.sessionToken) {
          setSessionToken(regData.sessionToken);
        }
      } catch { /* registration response parsing optional */ }

      // Build final profile
      profile.firstName = regFirst || profile.firstName;
      profile.lastName = regLast || profile.lastName;
      profile.campus = regCampus || profile.campus;
      profile.email = trimEmail;

      saveProfile(profile);
      setDone(true);
      setStep('done');

      // Close after a beat
      setTimeout(() => {
        setShowEmailGate(false);
        emailGateCallback.current?.();
        emailGateCallback.current = null;
      }, 1200);

    } catch {
      setError(t('something_wrong_error', lang));
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (persona) {
      saveSetup({ persona, source: 'onboarding' });
    }
    localStorage.setItem('dw_email_gate_skipped', 'true');
    setShowEmailGate(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 24,
      backdropFilter: 'blur(8px)',
    }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dw-email-gate-title"
        style={{
        background: 'var(--dw-surface)',
        borderRadius: 20,
        border: '1px solid var(--dw-border)',
        padding: 28,
        maxWidth: 400,
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
      }}>
        {/* Close button */}
        <button
          onClick={handleSkip}
          style={{
            // padding 12 + top/right 8 = same visual icon spot, 44px hit area
            position: 'absolute', top: 8, right: 8,
            background: 'none', border: 'none', color: 'var(--dw-text-muted)',
            cursor: 'pointer', padding: 12,
          }}
          aria-label={t('j_close', lang)}
        >
          <X size={20} />
        </button>

        {/* Step: Persona selection */}
        {step === 'persona' && (
          <div>
            <h2 id="dw-email-gate-title" style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--dw-text-primary)',
              marginBottom: 6,
            }}>
              {t('welcome_daily_word', lang)}
            </h2>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
              {t('choose_focus_desc', lang)}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PERSONAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePersonaSelect(p.id)}
                  style={{
                    background: 'var(--dw-canvas)',
                    border: '1px solid var(--dw-border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    minHeight: 44,
                  }}
                >
                  <p style={{ color: 'var(--dw-text-primary)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-sans)', marginBottom: 2 }}>
                    {PERSONA_I18N[p.id] ? t(PERSONA_I18N[p.id], lang) : p.label}
                  </p>
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                    {PERSONA_I18N[p.id] ? t(PERSONA_I18N[p.id] + '_desc', lang) : p.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Email + details */}
        {step === 'email' && (
          <div>
            <h2 id="dw-email-gate-title" style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--dw-text-primary)',
              marginBottom: 6,
            }}>
              {t('setup_profile_title', lang)}
            </h2>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
              {t('setup_profile_desc', lang)}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} onKeyDown={e => { if (e.key === 'Enter' && !saving) handleSubmit(); }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder={t('first_name_label', lang)}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder={t('last_name_label', lang)}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <input
                type="email"
                placeholder={t('email_address_label', lang)}
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                style={inputStyle}
              />

              <select
                value={campus}
                onChange={e => setCampus(e.target.value)}
                style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
              >
                <option value="">{t('select_campus_optional', lang)}</option>
                {CAMPUSES.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
                ))}
              </select>

              {error && (
                <p style={{ color: '#e57373', fontSize: 13, fontFamily: 'var(--font-sans)' }}>{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="dw-btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {saving ? t('setting_up', lang) : t('continue_label', lang)}
              </button>

              <button
                onClick={handleSkip}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--dw-text-muted)', fontSize: 13, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', padding: 8, minHeight: 44,
                }}
              >
                {t('skip_for_now', lang)}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} style={{ color: 'var(--dw-plan-light)', marginBottom: 16 }} />
            <h2 id="dw-email-gate-title" style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--dw-text-primary)',
              marginBottom: 8,
            }}>
              {t('welcome_short', lang)}
            </h2>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
              {t('profile_ready', lang)}
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--dw-canvas)',
  border: '1px solid var(--dw-border)',
  borderRadius: 10,
  padding: '12px 14px',
  color: 'var(--dw-text-primary)',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  minHeight: 44,
};
