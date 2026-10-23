import { buildTcx } from '@/src/strava/tcx';

describe('buildTcx', () => {
  test('builds XML with samples, HR, cadence, watts, and escapes notes', () => {
    const xml = buildTcx({
      name: 'Morning & hard <session>',
      sport: 'Other',
      startedAt: Date.parse('2026-01-01T12:00:00.000Z'),
      endedAt: Date.parse('2026-01-01T12:10:00.000Z'),
      metrics: {
        elapsedSeconds: 600,
        distanceMeters: 1200,
        totalEnergyKcal: 90.4,
      },
      samples: [
        {
          t: Date.parse('2026-01-01T12:00:00.000Z'),
          metrics: {
            distanceMeters: 0,
            heartRateBpm: 110,
            strokeRateSpm: 40,
            instantaneousPowerWatts: 95,
          },
        },
        {
          t: Date.parse('2026-01-01T12:10:00.000Z'),
          metrics: { distanceMeters: 1200, heartRateBpm: 140 },
        },
      ],
    });

    expect(xml).toContain('<TotalTimeSeconds>600</TotalTimeSeconds>');
    expect(xml).toContain('<DistanceMeters>1200</DistanceMeters>');
    expect(xml).toContain('<Calories>90</Calories>');
    expect(xml).toContain('<Value>110</Value>');
    expect(xml).toContain('<Cadence>40</Cadence>');
    expect(xml).toContain('<ns3:Watts>95</ns3:Watts>');
    expect(xml).toContain('Morning &amp; hard &lt;session&gt;');
  });

  test('synthesizes trackpoints when samples empty', () => {
    const startedAt = 1_000_000;
    const endedAt = 1_060_000;
    const xml = buildTcx({
      name: 'Empty',
      sport: 'Other',
      startedAt,
      endedAt,
      metrics: {},
      samples: [],
    });
    expect(xml).toContain('<TotalTimeSeconds>60</TotalTimeSeconds>');
    expect(xml.match(/<Trackpoint>/g)?.length).toBe(2);
  });
});
