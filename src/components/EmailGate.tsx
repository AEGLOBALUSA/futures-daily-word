/**
 * Email gate modal — onboarding overlay for new users.
 * Three-step profile resolution: PCO lookup → Supabase recall → new registration.
 */
import { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { CAMPUSES } from '../data/tokens';
import { ALL_PERSONAS, PERSONA_CONFIGS } from '../utils/persona-config';

const PERSONAS = ALL_PERSONAS.map(id => ({
  id,
  label: PERSONA_CONFIGS[id].label,
  desc: PERSONA_CONFIGS[id].description,
}));

export function EmailGate() {
  const { showEmailGate, setShowEmailGate, saveProfile, saveSetup, emailGateCallback } = useUser();

  const [step, setStep] = useState<'persona' | 'email' | 'done'>('persona');
  const [persona, setPersona] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [campus, setCampus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [_done, setDone] = useState(false);

  if (!showEmailGate) return null;

  const handlePersonaSelect = (p: string) => {
    setPersona(p);
    saveSetup({ persona: p, source: 'onboarding' });
    setStep('email');
  };

  const handleSubmit = async () => {
    const trimEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Step 1: Try PCO lookup
      let profile = { firstName: '', lastName: '', email: trimEmail, phone: '', church: '', city: '', campus: '' };

      try {
        const pcoRes = await fetch('/api/pco-sync', {
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
        const getRes = await fetch('/api/user-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', email: trimEmail }),
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          if (getData.profile) {
            profile = { ...profile, ...getData.profile, email: trimEmail };
          }
        }
      } catch { /* continue to register */ }

      // Step 3: Register if new
      const regFirst = firstName.trim() || profile.firstName;
      const regLast = lastName.trim() || profile.lastName;
      const regCampus = campus || profile.campus || '';

      await fetch('/api/user-profile', {
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
      setError('Something went wrong. Please try again.');
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
      <div style={{
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
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', color: 'var(--dw-text-muted)',
            cursor: 'pointer', padding: 4,
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Step: Persona selection */}
        {step === 'persona' && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--dw-text-primary)',
              marginBottom: 6,
            }}>
              Welcome to Daily Word
            </h2>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
              Choose your reading focus to personalize your experience.
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
                    {p.label}
                  </p>
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                    {p.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Email + details */}
        {step === 'email' && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--dw-text-primary)',
              marginBottom: 6,
            }}>
              Set Up Your Profile
            </h2>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
              Sync across devices and join your campus community.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                style={inputStyle}
              />

              <select
                value={campus}
                onChange={e => setCampus(e.target.value)}
                style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
              >
                <option value="">Select campus (optional)</option>
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
                {saving ? 'Setting up...' : 'Continue'}
              </button>

              <button
                onClick={handleSkip}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--dw-text-muted)', fontSize: 13, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', padding: 8, minHeight: 44,
                }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} style={{ color: '#93C5FD', marginBottom: 16 }} />
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--dw-text-primary)',
              marginBottom: 8,
            }}>
              Welcome!
            </h2>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
              Your profile is set up. Enjoy your reading.
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
