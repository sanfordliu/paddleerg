import { SelectMenu } from '@/src/components/SelectMenu';
import { useAthleteStore } from '@/src/store/athleteStore';
import { STRAVA_SPORT_OPTIONS, useStravaStore } from '@/src/store/stravaStore';
import type { StravaSportType } from '@/src/strava/config';

/** Workout / Strava sport type — shared SelectMenu wired to persisted preference. */
export function WorkoutTypeSelect() {
  const sportType = useStravaStore((s) => s.sportType);
  const setSportType = useStravaStore((s) => s.setSportType);
  const applyDefaults = useAthleteStore((s) => s.applyDefaults);

  return (
    <SelectMenu
      value={sportType}
      options={STRAVA_SPORT_OPTIONS}
      onChange={(value) => {
        const next = value as StravaSportType;
        setSportType(next);
        applyDefaults(next, false);
      }}
      accessibilityLabel="Workout type"
    />
  );
}
