import { describe, expect, it } from 'vitest';
import { parseNumericString } from '../importing';

describe("parseNumericString", () => {

  const expressions = [
    ["42", 42],
    ["-42", -42],
    ["+42", 42],
    ["3.14", 3.14],
    ["10+5-2", [10, 5, -2]],
    ["35+21-76", [35, 21, -76]],
    ["-5.5+2.5-1", [-5.5, 2.5, -1]],
    ["10 5 -2", [10, 5, -2]],
    ["1,200", 1200],
    ["   42   ", 42],
    ["", null],
    ["abc", null],
    ["10 +5", [10, 5]],
    ["80, -382, 596, 774, -379, 619", [80, -382, 596, 774, -379, 619]],
    ["1,200, 2,300, -500", [1200, 2300, -500]],
    ["$1,200", 1200],
    ["$1,200, $500", [1200, 500]],
    ["€2,500.75", 2500.75],
    ["£-300.50", -300.50],
    ["Total: $1,000", 1000],
    ["Value is €2,345.67", 2345.67]
  ];

  expressions.forEach(([expr, expected]) => {
    it(`parses "${expr}" correctly`, () => {
      expect(parseNumericString(expr as string)).toEqual(expected);
    });
  });
});
