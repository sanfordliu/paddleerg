import { SelectMenu } from '@/src/components/SelectMenu';
import { STRAVA_SPORT_OPTIONS, useStravaStore } from '@/src/store/stravaStore';

/** Workout / Strava sport type — shared SelectMenu wired to persisted preference. */
export function WorkoutTypeSelect() {
  const sportType = useStravaStore((s) => s.sportType);
  const setSportType = useStravaStore((s) => s.setSportType);

  return (
    <SelectMenu
      value={sportType}
      options={STRAVA_SPORT_OPTIONS}
      onChange={setSportType}
      accessibilityLabel="Workout type"
    />
  );
}
