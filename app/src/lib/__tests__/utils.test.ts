import { describe, expect, it } from "vitest";
import { titleCase } from '../utils';

describe('titleCase', () => {
  it('should convert strings to Title Case', () => {
    expect(titleCase('hello world')).toBe('Hello World');
    expect(titleCase('my-name_is here')).toBe('My Name Is Here');
    expect(titleCase('SINGLE')).toBe('Single');
    expect(titleCase('mixed CASE_string')).toBe('Mixed Case String');
    expect(titleCase('  leading and trailing  ')).toBe('Leading And Trailing');
    expect(titleCase('multiple   spaces--and__delims')).toBe('Multiple Spaces And Delims');
  });
});