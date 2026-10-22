import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MetricTile } from '@/src/components/MetricTile';
import { getMetricDef } from '@/src/metrics/catalog';
import { MAX_TILES, useLayoutStore } from '@/src/store/layoutStore';
import type { LiveMetrics } from '@/src/ble/types';
import { space } from '@/src/theme';

interface Props {
  metrics: LiveMetrics;
}

function columnCount(width: number, height: number, tileCount: number): number {
  if (width < height) return 2;
  if (width < 900 || tileCount < 5) return 2;
  return 3;
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function controlSizeForWindow(width: number, height: number): number {
  const cols = columnCount(width, height, 6);
  const rows = Math.ceil(6 / cols);
  const cellH = (height - 100) / rows;
  return Math.round(Math.min(56, Math.max(32, cellH * 0.12)));
}

export function MetricGrid({ metrics }: Props) {
  const { width, height } = useWindowDimensions();
  const tileIds = useLayoutStore((s) => s.tileIds);

  const visibleIds = tileIds.slice(0, MAX_TILES);
  const columns = columnCount(width, height, visibleIds.length);
  const rows = chunk(visibleIds, columns);
  const controlSize = controlSizeForWindow(width, height);

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((id) => {
              const def = getMetricDef(id);
              return (
                <View key={id} style={styles.cell}>
                  <MetricTile def={def} metrics={metrics} controlSize={controlSize} />
                </View>
              );
            })}
            {row.length < columns
              ? Array.from({ length: columns - row.length }, (_, i) => (
                  <View key={`pad-${i}`} style={styles.cell} />
                ))
              : null}
          </View>
        ))}
      </View>

      {tileIds.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>
          Choose metrics in Settings → Display.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%', minHeight: 0 },
  grid: {
    flex: 1,
    gap: space.md,
    minHeight: 0,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 0,
  },
  cell: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  empty: {
    textAlign: 'left',
    marginTop: space.sm,
    marginHorizontal: space.md,
    opacity: 0.85,
    lineHeight: 24,
  },
});
