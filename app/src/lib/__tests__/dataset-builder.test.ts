import { describe, expect, it } from 'vitest';
import { DATASET_TEMPLATES } from '../dataset-builder';
import { isSameUnit, isSupportedUnit } from '../friendly-numbers';

describe('dataset template units', () => {
  // Templates whose data has no unit Intl can format: counts, scores, calories, mmHg, mg
  const UNITLESS_TEMPLATES = ['blood-pressure', 'steps', 'nutrition-calories', 'mood', 'session-count', 'daily-rating', 'caffeine-intake'];

  it.each(DATASET_TEMPLATES.map((t) => [t.id, t] as const))('%s suggests only Intl-supported units', (_id, template) => {
    for (const unit of template.units) {
      expect(isSupportedUnit(unit)).toBe(true);
    }
  });

  it.each(DATASET_TEMPLATES.map((t) => [t.id, t] as const))('%s has a default that is one of its suggestions', (id, template) => {
    if (UNITLESS_TEMPLATES.includes(id)) {
      expect(template.units).toEqual([]);
      expect(template.defaultUnit).toBeNull();
    } else {
      expect(template.units.length).toBeGreaterThan(1);
      expect(template.defaultUnit).not.toBeNull();
      expect(template.units.some((unit) => isSameUnit(unit, template.defaultUnit ?? undefined))).toBe(true);
    }
  });
});
