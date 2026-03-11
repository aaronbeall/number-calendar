import { describe, expect, it } from 'vitest';
import { getValenceDegradationSignal, isBad } from '../valence';

describe('valence:getValenceDegradationSignal', () => {
  it('returns a bad signal for positive valence when value is positive and delta is negative', () => {
    const signal = getValenceDegradationSignal(10, -2, 'positive');
    expect(signal).toBeLessThan(0);
    expect(isBad(signal, 'positive')).toBe(true);
  });

  it('returns a bad signal for positive valence when value is negative and delta is positive', () => {
    const signal = getValenceDegradationSignal(-10, 2, 'positive');
    expect(signal).toBeLessThan(0);
    expect(isBad(signal, 'positive')).toBe(true);
  });

  it('returns no darkening signal when value and delta move in same direction for positive valence', () => {
    expect(getValenceDegradationSignal(10, 2, 'positive')).toBe(0);
    expect(getValenceDegradationSignal(-10, -2, 'positive')).toBe(0);
  });

  it('returns a bad signal for negative valence when value and delta move in opposite directions', () => {
    const signalA = getValenceDegradationSignal(10, -2, 'negative');
    const signalB = getValenceDegradationSignal(-10, 2, 'negative');
    expect(signalA).toBeGreaterThan(0);
    expect(signalB).toBeGreaterThan(0);
    expect(isBad(signalA, 'negative')).toBe(true);
    expect(isBad(signalB, 'negative')).toBe(true);
  });

  it('returns zero when valence is neutral or value/delta are zero', () => {
    expect(getValenceDegradationSignal(10, -2, 'neutral')).toBe(0);
    expect(getValenceDegradationSignal(0, -2, 'positive')).toBe(0);
    expect(getValenceDegradationSignal(10, 0, 'positive')).toBe(0);
  });
});
