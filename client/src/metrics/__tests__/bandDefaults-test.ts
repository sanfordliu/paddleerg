import {
  ageFromBirthYear,
  buildDefaultHrZones,
  buildDefaultTargets,
  estimatedMaxHr,
  resolveMaxHr,
} from '@/src/metrics/bandDefaults';
import { defaultHrZonesConfig } from '@/src/metrics/bands';

describe('bandDefaults', () => {
  test('ageFromBirthYear', () => {
    expect(ageFromBirthYear(null)).toBeNull();
    expect(ageFromBirthYear(1800)).toBeNull();
    expect(ageFromBirthYear(1990, new Date(2026, 5, 1))).toBe(36);
  });

  test('estimatedMaxHr and resolveMaxHr', () => {
    expect(estimatedMaxHr(40)).toBe(Math.round(208 - 0.7 * 40));
    expect(estimatedMaxHr(null)).toBe(Math.round(208 - 0.7 * 35));
    const cfg = defaultHrZonesConfig();
    expect(resolveMaxHr({ ...cfg, maxHr: 190 }, 1990)).toBe(190);
    expect(resolveMaxHr(cfg, 1990)).toBe(estimatedMaxHr(ageFromBirthYear(1990)));
  });

  test('buildDefaultTargets scales by fitness, sport, and gender', () => {
    const beginner = buildDefaultTargets('Rowing', {
      birthYear: 1990,
      gender: 'other',
      fitnessLevel: 'beginner',
    });
    const advancedMale = buildDefaultTargets('Rowing', {
      birthYear: 1990,
      gender: 'male',
      fitnessLevel: 'advanced',
    });
    const female = buildDefaultTargets('Kayaking', {
      birthYear: 1990,
      gender: 'female',
      fitnessLevel: 'intermediate',
    });
    const fallbackSport = buildDefaultTargets('Nope' as never, {
      birthYear: null,
      gender: null,
      fitnessLevel: 'intermediate',
    });
    expect(beginner.spm.enabled).toBe(true);
    expect(beginner.spm.lo!).toBeLessThan(beginner.spm.hi!);
    expect(advancedMale.power.hi!).toBeGreaterThan(beginner.power.hi!);
    expect(advancedMale.pace.lo!).toBeLessThan(beginner.pace.lo!);
    expect(female.power.hi!).toBeLessThan(
      buildDefaultTargets('Kayaking', {
        birthYear: 1990,
        gender: 'male',
        fitnessLevel: 'intermediate',
      }).power.hi!
    );
    expect(fallbackSport.spm.lo).toEqual(
      buildDefaultTargets('StandUpPaddling', {
        birthYear: null,
        gender: null,
        fitnessLevel: 'intermediate',
      }).spm.lo
    );
  });

  test('buildDefaultHrZones', () => {
    expect(buildDefaultHrZones()).toEqual(defaultHrZonesConfig());
  });
});
