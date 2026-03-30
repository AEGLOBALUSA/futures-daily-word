import { describe, it, expect } from 'vitest';
import {
  getPersonaConfig,
  getGreeting,
  PERSONA_CONFIGS,
  ALL_PERSONAS,
} from '../utils/persona-config';
import type { Persona } from '../utils/persona-config';

describe('PERSONA_CONFIGS', () => {
  it('defines exactly 5 personas', () => {
    expect(ALL_PERSONAS).toHaveLength(5);
    expect(ALL_PERSONAS).toEqual(
      expect.arrayContaining(['new_to_faith', 'congregation', 'deeper_study', 'pastor_leader', 'comfort'])
    );
  });

  it('every persona has required fields', () => {
    for (const key of ALL_PERSONAS) {
      const config = PERSONA_CONFIGS[key];
      expect(config.persona).toBe(key);
      expect(config.label).toBeTruthy();
      expect(config.description).toBeTruthy();
      expect(config.icon).toBeTruthy();
      expect(config.sectionOrder.length).toBeGreaterThan(0);
      expect(config.sectionOrder).toContain('greeting');
      expect(config.features).toBeDefined();
      expect(config.plans).toBeDefined();
      expect(config.journal).toBeDefined();
      expect(config.ai).toBeDefined();
    }
  });

  it('every persona has a non-empty AI system prompt addition', () => {
    for (const key of ALL_PERSONAS) {
      expect(PERSONA_CONFIGS[key].ai.systemPromptAddition.length).toBeGreaterThan(10);
    }
  });
});

describe('getPersonaConfig', () => {
  it('returns correct config for valid persona', () => {
    expect(getPersonaConfig('deeper_study').persona).toBe('deeper_study');
    expect(getPersonaConfig('comfort').persona).toBe('comfort');
  });

  it('returns congregation as default for null/undefined', () => {
    expect(getPersonaConfig(null).persona).toBe('congregation');
    expect(getPersonaConfig(undefined).persona).toBe('congregation');
    expect(getPersonaConfig('').persona).toBe('congregation');
  });

  it('migrates legacy persona names', () => {
    const config = getPersonaConfig('pastor');
    expect(config.persona).toBe('pastor_leader');
  });

  it('falls back to congregation for unknown persona', () => {
    expect(getPersonaConfig('nonexistent').persona).toBe('congregation');
  });
});

describe('getGreeting', () => {
  it('includes the users name', () => {
    const greeting = getGreeting('congregation', 'Ashley', 0);
    expect(greeting).toContain('Ashley');
  });

  it('uses "friend" when no name given', () => {
    const greeting = getGreeting('new_to_faith', '', 0);
    expect(greeting).toContain('friend');
  });

  it('uses "teman" for Indonesian when no name', () => {
    const greeting = getGreeting('new_to_faith', '', 0, 'id');
    expect(greeting).toContain('teman');
  });

  it('returns different greetings for different personas', () => {
    const newFaith = getGreeting('new_to_faith', 'Test', 0);
    const pastor = getGreeting('pastor_leader', 'Test', 0);
    expect(newFaith).not.toBe(pastor);
  });

  it('shows streak for congregation with streak > 1', () => {
    const greeting = getGreeting('congregation', 'Alex', 5);
    expect(greeting).toContain('5');
  });

  it('shows special message for pastor with 30+ streak', () => {
    const greeting = getGreeting('pastor_leader', 'Alex', 35);
    expect(greeting).toContain('35');
    expect(greeting).toContain('full cup');
  });

  it('comfort greeting does not crash', () => {
    const greeting = getGreeting('comfort', 'Sam', 0);
    expect(greeting).toBeTruthy();
    expect(greeting).toContain('Sam');
  });

  it('Indonesian greeting works for all personas', () => {
    for (const persona of ALL_PERSONAS) {
      const greeting = getGreeting(persona, 'Budi', 5, 'id');
      expect(greeting).toBeTruthy();
      expect(typeof greeting).toBe('string');
    }
  });
});
