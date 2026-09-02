/**
 * JourneyChoiceCard — chooser row only. Not a CTA. Tapping selects a path;
 * only NewFaithCTA starts Day 1.
 */
import type { KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import type { Persona } from '../utils/persona-config';
import { ALL_PERSONAS, isNewChristianPersona } from '../utils/persona-config';
import { t, getLang } from '../utils/i18n';

export const PERSONA_LABEL_KEY: Record<Persona, string> = {
  new_to_faith: 'persona_new',
  congregation: 'persona_member',
  deeper_study: 'persona_study',
  pastor_leader: 'persona_leader',
  comfort: 'persona_comfort',
};

export const PERSONA_DESC_KEY: Record<Persona, string> = {
  new_to_faith: 'persona_new_desc',
  congregation: 'persona_member_desc',
  deeper_study: 'persona_study_desc',
  pastor_leader: 'persona_leader_desc',
  comfort: 'persona_comfort_desc',
};

interface JourneyChoiceListProps {
  value: string;
  onChange: (persona: Persona) => void;
  name?: string;
  labelledBy?: string;
}

export function JourneyChoiceList({
  value,
  onChange,
  name = 'dw-journey',
  labelledBy,
}: JourneyChoiceListProps) {
  const lang = getLang();

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = ALL_PERSONAS.indexOf(value as Persona);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = ALL_PERSONAS[(Math.max(0, idx) + 1) % ALL_PERSONAS.length];
      onChange(next);
      (e.currentTarget.querySelector(`[data-persona="${next}"]`) as HTMLElement | null)?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = ALL_PERSONAS[(Math.max(0, idx) - 1 + ALL_PERSONAS.length) % ALL_PERSONAS.length];
      onChange(next);
      (e.currentTarget.querySelector(`[data-persona="${next}"]`) as HTMLElement | null)?.focus();
    }
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="dw-journey-choice-list"
      onKeyDown={onKeyDown}
    >
      {ALL_PERSONAS.map(persona => {
        const selected = persona === value || (isNewChristianPersona(persona) && isNewChristianPersona(value));
        const isNew = isNewChristianPersona(persona);
        return (
          <JourneyChoiceCard
            key={persona}
            name={name}
            persona={persona}
            selected={selected}
            isNew={isNew}
            label={t(PERSONA_LABEL_KEY[persona], lang)}
            description={t(PERSONA_DESC_KEY[persona], lang)}
            onSelect={() => onChange(persona)}
          />
        );
      })}
    </div>
  );
}

interface JourneyChoiceCardProps {
  name: string;
  persona: Persona;
  selected: boolean;
  isNew: boolean;
  label: string;
  description: string;
  onSelect: () => void;
}

export function JourneyChoiceCard({
  name,
  persona,
  selected,
  isNew,
  label,
  description,
  onSelect,
}: JourneyChoiceCardProps) {
  return (
    <label
      className={`dw-journey-choice${isNew ? ' is-new' : ''}${selected ? ' is-selected' : ''}`}
    >
      <input
        type="radio"
        name={name}
        value={persona}
        data-persona={persona}
        checked={selected}
        onChange={onSelect}
        className="dw-journey-choice-input"
      />
      <span className="dw-journey-choice-copy">
        <span className="dw-journey-choice-title">{label}</span>
        <span className="dw-journey-choice-desc">{description}</span>
      </span>
      {selected && (
        <Check
          size={18}
          strokeWidth={2.5}
          className="dw-journey-choice-check"
          aria-hidden
        />
      )}
    </label>
  );
}
