import { describe, it, expect } from 'vitest';
import { getPresentationStatus, formatCountdown, STARTING_SOON_WINDOW_MS } from './presentationStatus.js';

const NOW = new Date('2026-09-24T10:00:00.000Z').getTime();
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const upcoming = (overrides = {}) => ({
  displayStatus: 'REGISTRATION_OPEN',
  startTime: '18:00',
  startsAt: new Date(NOW + 30 * HOUR).toISOString(),
  ...overrides,
});

describe('getPresentationStatus', () => {
  it.each([
    ['DRAFT', 'DRAFT'],
    ['CANCELLED', 'CANCELLED'],
    ['COMPLETED', 'COMPLETED'],
    ['ONGOING', 'LIVE'],
  ])('maps the server status %s straight to %s', (displayStatus, expected) => {
    expect(getPresentationStatus({ displayStatus }, NOW).key).toBe(expected);
  });

  it('shows both open and closed registration as UPCOMING when the start is far off', () => {
    expect(getPresentationStatus(upcoming(), NOW).key).toBe('UPCOMING');
    expect(getPresentationStatus(upcoming({ displayStatus: 'REGISTRATION_CLOSED' }), NOW).key).toBe('UPCOMING');
  });

  it('flags closed registration separately instead of making it a status', () => {
    expect(getPresentationStatus(upcoming({ displayStatus: 'REGISTRATION_CLOSED' }), NOW).registrationClosed).toBe(true);
    expect(getPresentationStatus(upcoming(), NOW).registrationClosed).toBe(false);
  });

  it('promotes to STARTING_SOON inside 24 hours and labels it with a countdown', () => {
    const event = upcoming({ startsAt: new Date(NOW + 2 * HOUR + 15 * MINUTE).toISOString() });
    const status = getPresentationStatus(event, NOW);
    expect(status.key).toBe('STARTING_SOON');
    expect(status.label).toBe('Starts in 2H 15M');
    expect(status.tone).toBe('accent');
  });

  it('includes the 24-hour boundary and excludes anything past it', () => {
    const at = (ms) => getPresentationStatus(upcoming({ startsAt: new Date(NOW + ms).toISOString() }), NOW).key;
    expect(at(STARTING_SOON_WINDOW_MS)).toBe('STARTING_SOON');
    expect(at(STARTING_SOON_WINDOW_MS + 1)).toBe('UPCOMING');
  });

  it('never invents a countdown for an event with no start time (startsAt is then just midnight)', () => {
    const event = upcoming({ startTime: '', startsAt: new Date(NOW + 2 * HOUR).toISOString() });
    const status = getPresentationStatus(event, NOW);
    expect(status.key).toBe('UPCOMING');
    expect(status.countdownMs).toBeNull();
  });

  it('does not count down past the start — that is the server\'s job (it will say ONGOING)', () => {
    const event = upcoming({ startsAt: new Date(NOW - MINUTE).toISOString() });
    expect(getPresentationStatus(event, NOW).key).toBe('UPCOMING');
  });

  it('never counts down for a draft, cancelled or completed event even with a start time', () => {
    for (const displayStatus of ['DRAFT', 'CANCELLED', 'COMPLETED']) {
      const event = upcoming({ displayStatus, startsAt: new Date(NOW + HOUR).toISOString() });
      expect(getPresentationStatus(event, NOW).countdownMs).toBeNull();
    }
  });

  it('always pairs a status with an icon and a text label (never colour alone)', () => {
    for (const displayStatus of ['DRAFT', 'REGISTRATION_OPEN', 'ONGOING', 'COMPLETED', 'CANCELLED']) {
      const status = getPresentationStatus({ displayStatus }, NOW);
      expect(status.icon).toBeTruthy();
      expect(status.label.length).toBeGreaterThan(0);
    }
  });
});

describe('formatCountdown', () => {
  it('formats hours and minutes', () => {
    expect(formatCountdown(2 * HOUR + 15 * MINUTE)).toBe('2H 15M');
    expect(formatCountdown(3 * HOUR)).toBe('3H');
    expect(formatCountdown(45 * MINUTE)).toBe('45M');
  });

  it('rounds up and never shows 0M while time remains', () => {
    expect(formatCountdown(1)).toBe('1M');
    expect(formatCountdown(59 * 1000)).toBe('1M');
    expect(formatCountdown(HOUR + 1)).toBe('1H 1M');
  });
});
