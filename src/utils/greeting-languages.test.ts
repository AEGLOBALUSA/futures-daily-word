import { describe, it, expect } from 'vitest';
import { getGreeting } from './persona-config';

describe('getGreeting speaks every app language (front-page switch made English greetings visible)', () => {
  it('new_to_faith greets in es / pt / id, not English', () => {
    expect(getGreeting('new_to_faith', '', 0, 'es')).toMatch(/bienvenida/i);
    expect(getGreeting('new_to_faith', '', 0, 'pt')).toMatch(/Boas-vindas/);
    expect(getGreeting('new_to_faith', '', 0, 'id')).toMatch(/Selamat datang/);
    for (const l of ['es', 'pt', 'id']) expect(getGreeting('new_to_faith', '', 0, l)).not.toMatch(/Welcome/);
  });
  it('congregation / pastor greetings open with the language\'s own phrase', () => {
    expect(getGreeting('congregation', 'Ana', 3, 'es')).toMatch(/^Buen[oa]s (días|tardes|noches), Ana\. Día 3/);
    expect(getGreeting('pastor_leader', 'Rui', 9, 'pt')).toMatch(/^(Bom dia|Boa tarde|Boa noite), Rui\. Dia 9/);
  });
});
