import type { LiveMetrics, WorkoutSample } from '@/src/ble/types';

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a minimal TCX Activity for Strava upload.
 * Indoor paddling has no GPS; Strava marks trainer activities without lat/lng.
 */
export function buildTcx(options: {
  name: string;
  sport: string;
  startedAt: number;
  endedAt: number;
  metrics: LiveMetrics;
  samples: WorkoutSample[];
}): string {
  const { name, sport, startedAt, endedAt, metrics, samples } = options;
  const elapsed =
    metrics.elapsedSeconds ??
    Math.max(1, Math.round((endedAt - startedAt) / 1000));
  const distance = metrics.distanceMeters ?? 0;
  const calories = metrics.totalEnergyKcal;

  const trackpoints =
    samples.length > 0
      ? samples
      : [
          { t: startedAt, metrics },
          { t: endedAt, metrics },
        ];

  const tpXml = trackpoints
    .map((s) => {
      const dist = s.metrics.distanceMeters ?? 0;
      const hr = s.metrics.heartRateBpm;
      const cadence = s.metrics.strokeRateSpm;
      const watts = s.metrics.instantaneousPowerWatts;
      return `          <Trackpoint>
            <Time>${iso(s.t)}</Time>
            <DistanceMeters>${dist}</DistanceMeters>${
        hr != null
          ? `
            <HeartRateBpm><Value>${Math.round(hr)}</Value></HeartRateBpm>`
          : ''
      }${
        cadence != null
          ? `
            <Cadence>${Math.round(cadence)}</Cadence>`
          : ''
      }${
        watts != null
          ? `
            <Extensions>
              <ns3:TPX xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
                <ns3:Watts>${Math.round(watts)}</ns3:Watts>
              </ns3:TPX>
            </Extensions>`
          : ''
      }
          </Trackpoint>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
  <Activities>
    <Activity Sport="${escapeXml(sport)}">
      <Id>${iso(startedAt)}</Id>
      <Lap StartTime="${iso(startedAt)}">
        <TotalTimeSeconds>${elapsed}</TotalTimeSeconds>
        <DistanceMeters>${distance}</DistanceMeters>${
    calories != null
      ? `
        <Calories>${Math.round(calories)}</Calories>`
      : ''
  }
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
${tpXml}
        </Track>
      </Lap>
      <Notes>${escapeXml(name)}</Notes>
    </Activity>
  </Activities>
</TrainingCenterDatabase>
`;
}
