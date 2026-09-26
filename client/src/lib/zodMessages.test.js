import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import './zodMessages.js';

const firstMessage = (schema, value) => schema.safeParse(value).error.issues[0].message;

describe('zod defaults, in words', () => {
  it('reads required, length and number problems as sentences', () => {
    expect(firstMessage(z.object({ a: z.string() }), {})).toBe('This field is required');
    expect(firstMessage(z.string().min(1), '')).toBe('This field is required');
    expect(firstMessage(z.string().min(3), 'ab')).toBe('Use at least 3 characters');
    expect(firstMessage(z.string().max(5), 'abcdef')).toBe('Use at most 5 characters');
    expect(firstMessage(z.coerce.number(), 'abc')).toBe('Enter a number');
    expect(firstMessage(z.number().min(1), 0)).toBe('Must be at least 1');
  });

  it('reads email, link, option and date problems as sentences', () => {
    expect(firstMessage(z.string().email(), 'nope')).toBe('Enter a valid email address');
    expect(firstMessage(z.string().url(), 'nope')).toBe('Enter a link starting with http:// or https://');
    expect(firstMessage(z.enum(['a', 'b']), 'c')).toBe('Choose one of the options');
    expect(firstMessage(z.coerce.date(), 'zzz')).toBe('Enter a valid date');
  });

  it('never shows zod\'s developer wording', () => {
    const messages = z.object({ n: z.number(), s: z.string().min(2) }).safeParse({ n: 'x', s: '' }).error.issues.map((i) => i.message).join(' ');
    expect(messages).not.toMatch(/Expected|received|String must contain|Required/);
  });

  it('lets a message written on the schema win', () => {
    expect(firstMessage(z.string().min(2, 'Enter your full name'), 'a')).toBe('Enter your full name');
  });
});
