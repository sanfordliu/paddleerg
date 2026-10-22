import { forwardRef, useState } from 'react';
import { StyleSheet, View, type HostInstance } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { ExpandableRow } from '@/src/components/settings/ExpandableRow';
import { numStr, parseNum } from '@/src/components/settings/numberInput';
import { ageFromBirthYear, estimatedMaxHr } from '@/src/metrics/bandDefaults';
import {
  HR_ZONE_NAMES,
  hrZoneRanges,
  zonePctError,
  type HrZone,
  type HrZonesConfig,
} from '@/src/metrics/bands';
import { useAthleteStore } from '@/src/store/athleteStore';
import { space, zoneSwatches } from '@/src/theme';

interface Props {
  expanded: boolean;
  onToggleExpanded: () => void;
}

const ZONE_SWATCH: Record<HrZone, string> = {
  1: zoneSwatches.zone1,
  2: zoneSwatches.zone2,
  3: zoneSwatches.zone3,
  4: zoneSwatches.zone4,
  5: zoneSwatches.zone5,
};

function SwatchStrip() {
  return (
    <View style={styles.miniBar}>
      {([1, 2, 3, 4, 5] as HrZone[]).map((z) => (
        <View key={z} style={[styles.miniSeg, { backgroundColor: ZONE_SWATCH[z] }]} />
      ))}
    </View>
  );
}

/** Draft inputs; remounted (via key) whenever the saved values change. */
function HrZoneFields({
  cfg,
  age,
  onSave,
}: {
  cfg: HrZonesConfig;
  age: number | null;
  onSave: (next: Pick<HrZonesConfig, 'maxHr' | 'zoneLowerPct'>) => void;
}) {
  const theme = useTheme();
  const estimate = estimatedMaxHr(age);
  const maxHr = cfg.maxHr ?? estimate;
  const [maxText, setMaxText] = useState(numStr(cfg.maxHr));
  const [pctText, setPctText] = useState(cfg.zoneLowerPct.map(String));
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const rawMax = parseNum(maxText);
    if (maxText.trim() && (rawMax == null || rawMax < 100 || rawMax > 230)) {
      setError('Max HR should be between 100 and 230 bpm.');
      return;
    }
    const pcts = pctText.map((t) => parseNum(t) ?? Number.NaN);
    const err = zonePctError(pcts);
    setError(err);
    if (err) return;
    const nextMax = rawMax == null ? null : Math.round(rawMax);
    const same = nextMax === cfg.maxHr && pcts.every((p, i) => p === cfg.zoneLowerPct[i]);
    if (same) return;
    onSave({ maxHr: nextMax, zoneLowerPct: pcts });
  };

  const ranges = hrZoneRanges(cfg, maxHr);

  return (
    <>
      <TextInput
        mode="outlined"
        dense
        label="Max HR"
        placeholder={String(estimate)}
        value={maxText}
        onChangeText={setMaxText}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="number-pad"
        right={<TextInput.Affix text="bpm" />}
        error={!!error}
        style={styles.maxInput}
      />
      <HelperText type={error ? 'error' : 'info'} visible padding="none">
        {error ??
          (cfg.maxHr == null
            ? `Estimated ${estimate} from ${age != null ? `age ${age}` : 'a default age of 35'}. Enter a value to override.`
            : `Custom. Clear the field to use the estimate (${estimate}).`)}
      </HelperText>

      <View style={styles.zones}>
        {ranges.map(({ zone, lo, hi }, i) => (
          <View key={zone} style={styles.zoneRow}>
            <View style={[styles.swatch, { backgroundColor: ZONE_SWATCH[zone] }]} />
            <Text variant="titleSmall" style={[styles.zoneName, { color: theme.colors.onSurface }]}>
              {`Z${zone} ${HR_ZONE_NAMES[zone]}`}
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.zoneRange, { color: theme.colors.onSurfaceVariant }]}>
              {hi != null ? `${lo}–${hi - 1}` : `${lo}+`} bpm
            </Text>
            {i === 0 ? (
              <Text
                variant="bodyMedium"
                style={[styles.pctStatic, { color: theme.colors.onSurfaceVariant }]}>
                {`${cfg.zoneLowerPct[0]}%`}
              </Text>
            ) : (
              <TextInput
                mode="outlined"
                dense
                value={pctText[i]}
                onChangeText={(t) =>
                  setPctText((prev) => prev.map((p, j) => (j === i ? t : p)))
                }
                onBlur={commit}
                onSubmitEditing={commit}
                keyboardType="number-pad"
                right={<TextInput.Affix text="%" />}
                error={!!error}
                accessibilityLabel={`Zone ${zone} starts at percent of max HR`}
                style={styles.pctInput}
              />
            )}
          </View>
        ))}
      </View>
    </>
  );
}

export const HrZonesRow = forwardRef<HostInstance, Props>(function HrZonesRow(
  { expanded, onToggleExpanded },
  ref
) {
  const cfg = useAthleteStore((s) => s.hrZones);
  const birthYear = useAthleteStore((s) => s.profile.birthYear);
  const setHrZones = useAthleteStore((s) => s.setHrZones);
  const resetHrZones = useAthleteStore((s) => s.resetHrZones);

  const age = ageFromBirthYear(birthYear);
  const maxHr = cfg.maxHr ?? estimatedMaxHr(age);
  const description = `Max HR ${maxHr} · ${cfg.maxHr == null ? 'estimated from age' : 'custom'}`;

  return (
    <ExpandableRow
      ref={ref}
      title="Heart rate zones"
      description={cfg.enabled ? description : 'Off'}
      leading={<SwatchStrip />}
      custom={cfg.userModified}
      enabled={cfg.enabled}
      onEnabledChange={(enabled) => setHrZones({ ...cfg, enabled })}
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}>
      <HrZoneFields
        key={`${cfg.maxHr}|${cfg.zoneLowerPct.join(',')}`}
        cfg={cfg}
        age={age}
        onSave={(next) => setHrZones({ ...cfg, ...next })}
      />
      <View style={styles.actions}>
        <Button mode="text" compact onPress={resetHrZones}>
          Use estimate
        </Button>
      </View>
    </ExpandableRow>
  );
});

const styles = StyleSheet.create({
  miniBar: {
    flexDirection: 'row',
    width: 32,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  miniSeg: { flex: 1 },
  maxInput: { maxWidth: 200 },
  zones: { gap: space.sm },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 44,
  },
  swatch: {
    width: 12,
    height: 28,
    borderRadius: 4,
  },
  zoneName: { flex: 1, minWidth: 0 },
  zoneRange: { minWidth: 96, fontVariant: ['tabular-nums'] },
  pctStatic: { width: 96, textAlign: 'right', paddingRight: space.md },
  pctInput: { width: 96 },
  actions: { flexDirection: 'row' },
});
