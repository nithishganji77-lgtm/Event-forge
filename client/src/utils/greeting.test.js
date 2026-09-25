import { describe, it, expect } from 'vitest';
import { formatGreeting, getFirstName, getGreetingPhrase } from './greeting.js';

// Local-time constructors on purpose: the greeting is about the reader's own clock.
const at = (hour) => new Date(2026, 8, 24, hour, 30).getTime();

describe('getGreetingPhrase', () => {
  it.each([
    [5, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [23, 'Good evening'],
    [2, 'Good evening'],
  ])('at %i:30 says "%s"', (hour, phrase) => {
    expect(getGreetingPhrase(at(hour))).toBe(phrase);
  });
});

describe('getFirstName / formatGreeting', () => {
  it('uses the first word of the name', () => {
    expect(getFirstName('  Riya   Kapoor ')).toBe('Riya');
    expect(formatGreeting('Riya Kapoor', at(9))).toBe('Good morning, Riya');
  });

  it('drops the name rather than printing "undefined" when there is none', () => {
    expect(getFirstName(undefined)).toBe('');
    expect(formatGreeting(undefined, at(9))).toBe('Good morning');
    expect(formatGreeting('   ', at(15))).toBe('Good afternoon');
  });
});
