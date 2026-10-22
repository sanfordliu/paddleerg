import { forwardRef, useState } from 'react';
import { StyleSheet, View, type HostInstance } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { ExpandableRow } from '@/src/components/settings/ExpandableRow';
import { numStr, paceStr, parseNum, parsePace } from '@/src/components/settings/numberInput';
import { getMetricDef } from '@/src/metrics/catalog';
import {
  emptyTargetConfig,
  isLowerHarder,
  targetError,
  type TargetConfig,
  type TargetMetricId,
} from '@/src/metrics/bands';
import { useAthleteStore } from '@/src/store/athleteStore';
import { useStravaStore } from '@/src/store/stravaStore';
import { space, zoneSwatches } from '@/src/theme';

interface Props {
  id: TargetMetricId;
  expanded: boolean;
  onToggleExpanded: () => void;
}

const EMPTY_TARGET = emptyTargetConfig();

const STRIP_COLORS = [
  zoneSwatches.targetUnderFar,
  zoneSwatches.targetUnderNear,
  zoneSwatches.targetIn,
  zoneSwatches.targetOverNear,
  zoneSwatches.targetOverFar,
];

function isPaceMetric(id: TargetMetricId) {
  return id === 'pace' || id === 'avgPace';
}

function fmt(id: TargetMetricId, n: number | null): string {
  return isPaceMetric(id) ? paceStr(n) : numStr(n == null ? null : Math.round(n));
}

function summary(id: TargetMetricId, cfg: TargetConfig): string {
  if (!cfg.enabled) return 'Off';
  if (targetError(cfg)) return 'Incomplete';
  const unit = getMetricDef(id).unit;
  const near = isPaceMetric(id) ? `${cfg.nearMargin}s` : String(cfg.nearMargin);
  return `${fmt(id, cfg.lo)}–${fmt(id, cfg.hi)} ${unit} · near ±${near}`;
}

/** Boundary labels ordered easy → hard, matching the strip colors. */
function stripLabels(id: TargetMetricId, cfg: TargetConfig): string[] {
  const { lo, hi, nearMargin: near } = cfg;
  if (lo == null || hi == null || near == null) return [];
  const asc = [lo - near, lo, hi, hi + near];
  const ordered = isLowerHarder(id) ? [...asc].reverse() : asc;
  return ordered.map((n) => fmt(id, n));
}

function MiniBar() {
  return (
    <View style={styles.miniBar}>
      {[zoneSwatches.targetUnderNear, zoneSwatches.targetIn, zoneSwatches.targetOverNear].map(
        (c) => (
          <View key={c} style={[styles.miniSeg, { backgroundColor: c }]} />
        )
      )}
    </View>
  );
}

type TargetValues = Pick<TargetConfig, 'lo' | 'hi' | 'nearMargin'>;

/** Draft inputs; remounted (via key) whenever the saved values change. */
function TargetFields({
  id,
  cfg,
  onSave,
}: {
  id: TargetMetricId;
  cfg: TargetConfig;
  onSave: (next: TargetValues) => void;
}) {
  const def = getMetricDef(id);
  const pace = isPaceMetric(id);
  const [lo, setLo] = useState(pace ? paceStr(cfg.lo) : numStr(cfg.lo));
  const [hi, setHi] = useState(pace ? paceStr(cfg.hi) : numStr(cfg.hi));
  const [near, setNear] = useState(numStr(cfg.nearMargin));
  const [error, setError] = useState<string | null>(null);

  const parse = pace ? parsePace : parseNum;

  const commit = () => {
    const next = { lo: parse(lo), hi: parse(hi), nearMargin: parseNum(near) };
    const err = targetError(next);
    setError(err);
    if (err) return;
    if (next.lo === cfg.lo && next.hi === cfg.hi && next.nearMargin === cfg.nearMargin) return;
    onSave(next);
  };

  const unitAffix = def.unit ? <TextInput.Affix text={def.unit} /> : undefined;
  const keyboard = pace ? 'numbers-and-punctuation' : 'numeric';

  return (
    <>
      <View style={styles.pair}>
        <TextInput
          mode="outlined"
          dense
          label="Target low"
          placeholder={pace ? 'm:ss' : undefined}
          value={lo}
          onChangeText={setLo}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType={keyboard}
          right={unitAffix}
          error={!!error}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          dense
          label="Target high"
          placeholder={pace ? 'm:ss' : undefined}
          value={hi}
          onChangeText={setHi}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType={keyboard}
          right={unitAffix}
          error={!!error}
          style={styles.input}
        />
      </View>
      <TextInput
        mode="outlined"
        dense
        label="Near margin"
        value={near}
        onChangeText={setNear}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="numeric"
        right={<TextInput.Affix text={pace ? 's' : def.unit || ''} />}
        error={!!error}
        style={styles.nearInput}
      />
      {error ? (
        <HelperText type="error" visible padding="none">
          {error}
        </HelperText>
      ) : (
        <HelperText type="info" visible padding="none">
          {pace
            ? 'Faster than target counts as over (harder).'
            : 'Values within the near margin show light blue or orange.'}
        </HelperText>
      )}
    </>
  );
}

export const TargetRow = forwardRef<HostInstance, Props>(function TargetRow(
  { id, expanded, onToggleExpanded },
  ref
) {
  const theme = useTheme();
  const def = getMetricDef(id);
  const cfg = useAthleteStore((s) => s.bands[id]) ?? EMPTY_TARGET;
  const setTarget = useAthleteStore((s) => s.setTarget);
  const resetTarget = useAthleteStore((s) => s.resetTarget);
  const sportType = useStravaStore((s) => s.sportType);
  const labels = stripLabels(id, cfg);

  return (
    <ExpandableRow
      ref={ref}
      title={def.label}
      description={summary(id, cfg)}
      leading={<MiniBar />}
      custom={cfg.userModified}
      enabled={cfg.enabled}
      onEnabledChange={(enabled) => setTarget(id, { ...cfg, enabled })}
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}>
      {cfg.enabled ? (
        <>
          <TargetFields
            key={`${cfg.lo}|${cfg.hi}|${cfg.nearMargin}`}
            id={id}
            cfg={cfg}
            onSave={(next) => setTarget(id, { ...cfg, ...next, enabled: true })}
          />

          {labels.length === 4 ? (
            <View accessible accessibilityLabel={`Color preview: ${labels.join(', ')}`}>
              <View style={[styles.strip, { borderRadius: theme.roundness / 2 }]}>
                {STRIP_COLORS.map((c) => (
                  <View key={c} style={[styles.stripSeg, { backgroundColor: c }]} />
                ))}
              </View>
              <View style={styles.stripLabels}>
                <View style={styles.stripLabelSpacer} />
                {labels.map((l, i) => (
                  <Text
                    key={`${l}-${i}`}
                    variant="labelSmall"
                    style={[styles.stripLabel, { color: theme.colors.onSurfaceVariant }]}>
                    {l}
                  </Text>
                ))}
                <View style={styles.stripLabelSpacer} />
              </View>
              <View style={styles.stripEnds}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Easier
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Harder
                </Text>
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Turn on to color the {def.label} tile by target.
        </Text>
      )}

      <View style={styles.actions}>
        <Button mode="text" compact onPress={() => resetTarget(id, sportType)}>
          Use profile defaults
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
  pair: {
    flexDirection: 'row',
    gap: space.md,
  },
  input: { flex: 1 },
  nearInput: { maxWidth: 200 },
  strip: {
    flexDirection: 'row',
    height: 10,
    overflow: 'hidden',
  },
  stripSeg: { flex: 1 },
  stripLabels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  stripLabelSpacer: { flex: 0.5 },
  stripLabel: {
    flex: 1,
    textAlign: 'center',
  },
  stripEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
  },
});
