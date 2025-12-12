import { describe, expect, it } from "vitest";
import { detectExpressionTrackingFormat } from "../expression";

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