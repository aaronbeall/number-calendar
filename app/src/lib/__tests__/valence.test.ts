import { describe, expect, it } from 'vitest';
import {
  getValueForValenceStrength,
  isValenceDegraded,
} from '../valence';

describe('valence:isValenceDegraded', () => {
  it('is true when value and delta are opposite directions', () => {
    expect(isValenceDegraded(10, -2, 'positive')).toBe(true);
    expect(isValenceDegraded(-10, 2, 'positive')).toBe(true);
    expect(isValenceDegraded(10, -2, 'negative')).toBe(true);
    expect(isValenceDegraded(-10, 2, 'negative')).toBe(true);
  });

  it('is false when value and delta are same direction or neutral cases', () => {
    expect(isValenceDegraded(10, 2, 'positive')).toBe(false);
    expect(isValenceDegraded(-10, -2, 'negative')).toBe(false);
    expect(isValenceDegraded(0, -2, 'positive')).toBe(false);
    expect(isValenceDegraded(10, 0, 'positive')).toBe(false);
    expect(isValenceDegraded(10, -2, 'neutral')).toBe(false);
  });
});

describe('valence:getValueForValenceStrength', () => {
  const values = {
    good: 'good',
    degradedGood: 'degradedGood',
    bad: 'bad',
    degradedBad: 'degradedBad',
    neutral: 'neutral',
  } as const;

  it('matches positive valence matrix', () => {
    expect(getValueForValenceStrength(10, 2, 'positive', values)).toBe('good');
    expect(getValueForValenceStrength(10, -2, 'positive', values)).toBe('degradedGood');
    expect(getValueForValenceStrength(-10, -2, 'positive', values)).toBe('bad');
    expect(getValueForValenceStrength(-10, 2, 'positive', values)).toBe('degradedBad');
  });

  it('matches negative valence matrix', () => {
    expect(getValueForValenceStrength(-10, -2, 'negative', values)).toBe('good');
    expect(getValueForValenceStrength(-10, 2, 'negative', values)).toBe('degradedGood');
    expect(getValueForValenceStrength(10, 2, 'negative', values)).toBe('bad');
    expect(getValueForValenceStrength(10, -2, 'negative', values)).toBe('degradedBad');
  });

  it('returns neutral for neutral/zero-value cases', () => {
    expect(getValueForValenceStrength(10, -2, 'neutral', values)).toBe('neutral');
    expect(getValueForValenceStrength(0, -2, 'positive', values)).toBe('neutral');
  });
});
