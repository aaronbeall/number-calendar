import { describe, expect, it } from "vitest";
import { detectExpressionTrackingFormat } from "../expression";
import { parseSeriesExpression, parseTrendExpression } from '../expression';

describe('detectExpressionTrackingFormat', () => {
  it('detects series expressions with plus and minus', () => {
    expect(detectExpressionTrackingFormat('10+5-2')).toBe('series');
    expect(detectExpressionTrackingFormat('-3+7-10')).toBe('series');
    expect(detectExpressionTrackingFormat('10 +5')).toBe('series');
    expect(detectExpressionTrackingFormat('-10 +5')).toBe('series');
  });

  it('detects series expressions with target totals', () => {
    expect(detectExpressionTrackingFormat('35+21-76=50')).toBe('series');
    expect(detectExpressionTrackingFormat('-5=5=0')).toBe('series');
  });

  it('detects trend expressions with spaced numbers', () => {
    expect(detectExpressionTrackingFormat('10 5 -2')).toBe('trend');
    expect(detectExpressionTrackingFormat('-3 7 -10')).toBe('trend');
  });

  it('detects trend expressions with deltas', () => {
    expect(detectExpressionTrackingFormat('240 +=2')).toBe('trend');
    expect(detectExpressionTrackingFormat('5 -=3')).toBe('trend');
  });

  it('ignores surrounding whitespace', () => {
    expect(detectExpressionTrackingFormat('   1 2 3   ')).toBe('trend');
    expect(detectExpressionTrackingFormat('\n10+5-2\t')).toBe('series');
  });

  it('ignores currency symbols', () => {
    expect(detectExpressionTrackingFormat('$10 +$5 -$2')).toBe('series');
    expect(detectExpressionTrackingFormat('€240 +=€2')).toBe('trend');
  });

  it('ignores thousands separators', () => {
    expect(detectExpressionTrackingFormat('1,200+2,300-500=3,000')).toBe('series');
    expect(detectExpressionTrackingFormat('1,200 2,300 -500')).toBe('trend');
  });

  it('returns null for unsupported formats', () => {
    expect(detectExpressionTrackingFormat('')).toBeNull();
    expect(detectExpressionTrackingFormat('abc')).toBeNull();
    expect(detectExpressionTrackingFormat('10,20')).toBeNull();
    expect(detectExpressionTrackingFormat('10;5')).toBeNull();
  });

  it("returns series ignoring comma separators", () => {
    expect(detectExpressionTrackingFormat('1,200+2,300-500=3,000')).toBe('series');
    expect(detectExpressionTrackingFormat('-1,000+500= -500')).toBe('series');
  });

  it("returns trend ignoring comma separators", () => {
    expect(detectExpressionTrackingFormat('80, -382, 596, 774, -379, 619')).toBe('trend');
    expect(detectExpressionTrackingFormat('1,200, 2,300, -500')).toBe('trend');
  });
});

describe('parseSeriesExpression', () => {
  it('parses simple plus/minus sequences', () => {
    expect(parseSeriesExpression('10+5-2')).toEqual([10, 5, -2]);
    expect(parseSeriesExpression('-3+7-10')).toEqual([-3, 7, -10]);
  });

  it('parses target totals and computes deltas', () => {
    expect(parseSeriesExpression('35+21-76=50')).toEqual([35, 21, -76, 70]);
    expect(parseSeriesExpression('10+5-2=20=10+10')).toEqual([10, 5, -2, 7, 0]);
  });

  it('handles currency and thousands separators', () => {
    expect(parseSeriesExpression('$1,200 +$300 -50')).toEqual([1200, 300, -50]);
  });

  it('returns null for invalid or empty input', () => {
    expect(parseSeriesExpression('')).toBeNull();
    expect(parseSeriesExpression('abc')).toBeNull();
  });
});

describe('parseTrendExpression', () => {
  it('parses space-delimited numbers', () => {
    expect(parseTrendExpression('10 5 -2')).toEqual([10, 5, -2]);
    expect(parseTrendExpression('-3 7 -10')).toEqual([-3, 7, -10]);
  });

  it('parses semicolon and pipe delimiters', () => {
    expect(parseTrendExpression('10;5|-2')).toEqual([10, 5, -2]);
  });

  it('parses deltas applied to the last number', () => {
    expect(parseTrendExpression('240 +=2')).toEqual([240, 242]);
    expect(parseTrendExpression('5 -=3')).toEqual([5, 2]);
  });

  it('handles currency and thousands separators', () => {
    expect(parseTrendExpression('1,200 2,300 -500')).toEqual([1200, 2300, -500]);
  });

  it('returns null for invalid tokens or standalone deltas', () => {
    expect(parseTrendExpression('+=2')).toBeNull();
    expect(parseTrendExpression('abc 10')).toBeNull();
  });

  it('returns empty array for blank input', () => {
    expect(parseTrendExpression('')).toEqual([]);
  });
});
