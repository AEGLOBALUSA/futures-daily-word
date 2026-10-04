import { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useCampusGuess } from '../utils/useCampusGuess';
import { usePcoCampus } from '../utils/pcoCampus';
import { chooseCampus } from '../utils/campusGuess';
import { campusName, useCampuses } from '../data/campuses';
import { CampusSelect } from './CampusSelect';
import { t, getLang } from '../utils/i18n';

export function CampusConfirm({ userProfile }: { userProfile: any }) {
  const { saveProfile, requireEmail } = useUser();
  const pco = usePcoCampus(userProfile?.email, true);
  const guess = useCampusGuess(true, pco.campusId, pco.pending);
  const campuses = useCampuses();
  const [lang, setLang] = useState(getLang());
  const [showList, setShowList] = useState(false);
  const [showElse, setShowElse] = useState(false);

  useEffect(() => {
    const handleLanguageChange = () => setLang(getLang());
    window.addEventListener('dw-lang-changed', handleLanguageChange);
    return () => window.removeEventListener('dw-lang-changed', handleLanguageChange);
  }, []);

  const selectCampus = (id: string) => chooseCampus(id, { userProfile, saveProfile, requireEmail });
  const guessedCampus = guess.campusId ? campusName(guess.campusId, campuses) : '';
  const whyKey = guess.source === 'param' || guess.source === 'pco' || guess.source === 'town'
    ? `campus_why_${guess.source}`
    : null;
  const questionId = 'campus-confirm-question';

  if (!guess.ready) {
    return (
      <section aria-labelledby={questionId} style={{ padding: '32px 24px', textAlign: 'left' }}>
        <p id={questionId} style={{ color: 'var(--dw-text-muted)', fontSize: 15, fontFamily: 'var(--font-sans)', margin: 0 }}>
          {t('j_loading', lang)}
        </p>
      </section>
    );
  }

  if (guess.campusId && !showList) {
    return (
      <section aria-labelledby={questionId} style={{ padding: '32px 24px', textAlign: 'left' }}>
        <h2 id={questionId} style={{ color: 'var(--dw-text)', fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-sans)', lineHeight: 1.25, margin: '0 0 10px' }}>
          {t('campus_confirm_q', lang).replace('{campus}', guessedCampus)}
        </h2>
        {whyKey && (
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 15, fontFamily: 'var(--font-sans)', lineHeight: 1.45, margin: '0 0 24px' }}>
            {t(whyKey, lang)}
          </p>
        )}
        <button
          type="button"
          className="dw-next dw-campus-main"
          aria-label={t('campus_confirm_yes_aria', lang).replace('{campus}', guessedCampus)}
          onClick={() => selectCampus(guess.campusId!)}
          style={{ width: '100%', minHeight: 56, borderRadius: 999, fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-sans)' }}
        >
          {t('campus_confirm_yes', lang)}
        </button>
        <button
          type="button"
          onClick={() => setShowList(true)}
          style={{ width: '100%', minHeight: 48, marginTop: 12, borderRadius: 999, border: '1px solid var(--dw-border)', background: 'transparent', color: 'var(--dw-text)', fontSize: 17, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
        >
          {t('campus_confirm_other', lang)}
        </button>
      </section>
    );
  }

  const nearby = guess.shortList
    .filter(id => !(showList && id === guess.campusId))
    .map(id => campuses.find(campus => campus.id === id))
    .filter((campus): campus is typeof campuses[number] => Boolean(campus));

  return (
    <section aria-labelledby={questionId} style={{ padding: '32px 24px', textAlign: 'left' }}>
      <h2 id={questionId} style={{ color: 'var(--dw-text)', fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-sans)', lineHeight: 1.25, margin: '0 0 24px' }}>
        {t('campus_which_q', lang)}
      </h2>
      {nearby.length > 0 && (
        <>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-sans)', margin: '0 0 10px' }}>
            {t('campus_near_you', lang)}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nearby.map(campus => (
              <button
                key={campus.id}
                type="button"
                aria-label={t('campus_choose_aria', lang).replace('{campus}', campus.name)}
                onClick={() => selectCampus(campus.id)}
                style={{ width: '100%', minHeight: 56, padding: '10px 16px', borderRadius: 12, border: '1px solid var(--dw-border)', background: 'transparent', color: 'var(--dw-text)', textAlign: 'left', fontFamily: 'var(--font-sans)' }}
              >
                <span style={{ display: 'block', fontSize: 17, fontWeight: 600 }}>{campus.name}</span>
                <span style={{ display: 'block', color: 'var(--dw-text-muted)', fontSize: 15, marginTop: 2 }}>{campus.city}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {nearby.length > 0 && !showElse && (
        <button
          type="button"
          onClick={() => setShowElse(true)}
          style={{ minHeight: 44, marginTop: 12, padding: 0, border: 0, background: 'transparent', color: 'var(--dw-accent)', fontSize: 17, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
        >
          {t('campus_somewhere_else', lang)}
        </button>
      )}
      {(showElse || nearby.length === 0) && (
        <div style={{ marginTop: nearby.length > 0 ? 12 : 0 }}>
          <CampusSelect value="" onChange={id => id && selectCampus(id)} />
        </div>
      )}
    </section>
  );
}
