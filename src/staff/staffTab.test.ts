import { describe, it, expect } from 'vitest';
import { staffTabFromRaw } from './StaffApp';

describe('staffTabFromRaw', () => {
  it('sends the retired questions tab home', () => {
    expect(staffTabFromRaw('questions')).toBe('home');
    expect(staffTabFromRaw('Questions')).toBe('home');
    expect(staffTabFromRaw(' questions ')).toBe('home');
  });

  it('keeps the remaining staff screens', () => {
    expect(staffTabFromRaw('home')).toBe('home');
    expect(staffTabFromRaw('form')).toBe('form');
    expect(staffTabFromRaw('review')).toBe('review');
    expect(staffTabFromRaw('people')).toBe('people');
  });
});
