import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { ScreenOverlay } from '@/src/components/ScreenOverlay';
import { getMetricDef } from '@/src/metrics/catalog';
import { buildDefaultBands } from '@/src/metrics/bandDefaults';
import {
  emptyBandConfig,
  isBandConfigured,
  type BandableMetricId,
  type MetricBandConfig,
} from '@/src/metrics/bands';
import { useAthleteStore } from '@/src/store/athleteStore';
import { useStravaStore } from '@/src/store/stravaStore';
import { space } from '@/src/theme';

interface Props {
  metricId: BandableMetricId | null;
  visible: boolean;
  onClose: () => void;
}

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function numStr(n: number | null): string {
  return n == null ? '' : String(n);
}

export function BandEditor({ metricId, visible, onClose }: Props) {
  const theme = useTheme();
  const sportType = useStravaStore((s) => s.sportType);
  const profile = useAthleteStore((s) => s.profile);
  const getBand = useAthleteStore((s) => s.getBand);
  const setBand = useAthleteStore((s) => s.setBand);
  const clearBand = useAthleteStore((s) => s.clearBand);

  const [enabled, setEnabled] = useState(false);
  const [greenLo, setGreenLo] = useState('');
  const [greenHi, setGreenHi] = useState('');
  const [yellowLo, setYellowLo] = useState('');
  const [yellowHi, setYellowHi] = useState('');

  useEffect(() => {
    if (!metricId || !visible) return;
    const c = getBand(metricId);
    setEnabled(c.enabled);
    setGreenLo(numStr(c.greenLo));
    setGreenHi(numStr(c.greenHi));
    setYellowLo(numStr(c.yellowLo));
    setYellowHi(numStr(c.yellowHi));
  }, [metricId, visible, getBand]);

  if (!metricId) return null;

  const def = getMetricDef(metricId);
  const unitHint = def.unit ? ` (${def.unit})` : '';

  const draft: MetricBandConfig = {
    enabled,
    greenLo: parseNum(greenLo),
    greenHi: parseNum(greenHi),
    yellowLo: parseNum(yellowLo),
    yellowHi: parseNum(yellowHi),
    userModified: true,
  };

  const canSave = !enabled || isBandConfigured({ ...draft, enabled: true });

  const save = () => {
    if (!enabled) {
      clearBand(metricId);
      onClose();
      return;
    }
    if (!isBandConfigured({ ...draft, enabled: true })) return;
    setBand(metricId, { ...draft, enabled: true });
    onClose();
  };

  const applyDefaults = () => {
    const suggested = buildDefaultBands(sportType, profile)[metricId];
    setEnabled(true);
    setGreenLo(numStr(suggested.greenLo));
    setGreenHi(numStr(suggested.greenHi));
    setYellowLo(numStr(suggested.yellowLo));
    setYellowHi(numStr(suggested.yellowHi));
  };

  return (
    <ScreenOverlay
      visible={visible}
      title={`${def.label} bands`}
      onClose={onClose}
      closeAccessibilityLabel="Close band settings">
      <Text variant="bodyMedium" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        Green = target range, yellow = near miss, red = outside. Leave disabled or clear fields to
        turn banding off. Values are coaching heuristics, not medical advice.
        {unitHint}
      </Text>

      <View style={styles.row}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
          Enable bands
        </Text>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>

      <Text variant="labelLarge" style={[styles.section, { color: theme.colors.tertiary }]}>
        Green (target)
      </Text>
      <View style={styles.pair}>
        <TextInput
          mode="outlined"
          label="Low"
          value={greenLo}
          onChangeText={setGreenLo}
          keyboardType="numeric"
          disabled={!enabled}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="High"
          value={greenHi}
          onChangeText={setGreenHi}
          keyboardType="numeric"
          disabled={!enabled}
          style={styles.input}
        />
      </View>

      <Text
        variant="labelLarge"
        style={[styles.section, { color: theme.colors.onSurfaceVariant }]}>
        Yellow (near)
      </Text>
      <View style={styles.pair}>
        <TextInput
          mode="outlined"
          label="Low"
          value={yellowLo}
          onChangeText={setYellowLo}
          keyboardType="numeric"
          disabled={!enabled}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="High"
          value={yellowHi}
          onChangeText={setYellowHi}
          keyboardType="numeric"
          disabled={!enabled}
          style={styles.input}
        />
      </View>

      <View style={styles.actions}>
        <Button mode="outlined" textColor={theme.colors.onSurface} onPress={applyDefaults}>
          Use profile defaults
        </Button>
        <Button
          mode="outlined"
          textColor={theme.colors.error}
          onPress={() => {
            setEnabled(false);
            const e = emptyBandConfig();
            setGreenLo(numStr(e.greenLo));
            setGreenHi(numStr(e.greenHi));
            setYellowLo(numStr(e.yellowLo));
            setYellowHi(numStr(e.yellowHi));
          }}>
          Clear / disable
        </Button>
        <Button mode="contained" disabled={!canSave} onPress={save}>
          Save
        </Button>
      </View>
    </ScreenOverlay>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginHorizontal: space.md,
    marginBottom: space.lg,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: space.md,
    marginBottom: space.md,
  },
  section: {
    marginHorizontal: space.md,
    marginTop: space.md,
    marginBottom: space.sm,
    fontWeight: '600',
  },
  pair: {
    flexDirection: 'row',
    gap: space.md,
    marginHorizontal: space.md,
  },
  input: {
    flex: 1,
  },
  actions: {
    marginTop: space.xl,
    marginHorizontal: space.md,
    gap: space.sm,
    alignItems: 'flex-start',
  },
});
