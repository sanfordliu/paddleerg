import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { MetricTile } from '@/src/components/MetricTile';
import { METRIC_CATALOG, getMetricDef, type MetricId } from '@/src/metrics/catalog';
import { MAX_TILES, useLayoutStore } from '@/src/store/layoutStore';
import type { LiveMetrics } from '@/src/ble/types';
import { space } from '@/src/theme';

interface Props {
  metrics: LiveMetrics;
}

function columnCount(width: number, height: number, tileCount: number): number {
  // Portrait: 2 columns × up to 3 rows (max 6 tiles)
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

export function MetricGrid({ metrics }: Props) {
  const { width, height } = useWindowDimensions();
  const tileIds = useLayoutStore((s) => s.tileIds);
  const editing = useLayoutStore((s) => s.editing);
  const setEditing = useLayoutStore((s) => s.setEditing);
  const reorder = useLayoutStore((s) => s.reorder);
  const removeTile = useLayoutStore((s) => s.removeTile);
  const addTile = useLayoutStore((s) => s.addTile);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const visibleIds = tileIds.slice(0, MAX_TILES);
  const columns = columnCount(width, height, visibleIds.length);
  const rows = chunk(visibleIds, columns);
  const atLimit = tileIds.length >= MAX_TILES;

  const availableToAdd = useMemo(
    () => METRIC_CATALOG.filter((m) => !tileIds.includes(m.id)),
    [tileIds]
  );

  return (
    <View style={styles.wrap}>
      {editing ? (
        <View style={styles.editBar}>
          <Button
            mode="contained"
            icon="plus"
            disabled={availableToAdd.length === 0 || atLimit}
            onPress={() => setAddOpen(true)}>
            Add metric
          </Button>
          <Text variant="bodySmall" style={styles.hint}>
            {atLimit ? `Maximum ${MAX_TILES} tiles` : 'Drag tiles to reorder'}
          </Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((id, colIndex) => {
              const index = rowIndex * columns + colIndex;
              const def = getMetricDef(id);
              return (
                <View key={id} style={styles.cell}>
                  <MetricTile
                    def={def}
                    metrics={metrics}
                    editing={editing}
                    dragging={dragIndex === index}
                    onLongPress={() => setEditing(true)}
                    onDelete={() => removeTile(id)}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={() => {
                      if (dragIndex != null && dragIndex !== index) {
                        reorder(dragIndex, index);
                        setDragIndex(index);
                      }
                    }}
                    onDrop={() => setDragIndex(null)}
                  />
                </View>
              );
            })}
            {/* Pad incomplete last row so cells stay equal width */}
            {row.length < columns
              ? Array.from({ length: columns - row.length }, (_, i) => (
                  <View key={`pad-${i}`} style={styles.cell} />
                ))
              : null}
          </View>
        ))}
      </View>

      {editing && tileIds.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>
          No metrics on the board. Tap Add to choose some.
        </Text>
      ) : null}

      <Portal>
        <Dialog visible={addOpen} onDismiss={() => setAddOpen(false)}>
          <Dialog.Title>Add metric</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            {availableToAdd.length === 0 || atLimit ? (
              <Text variant="bodyMedium" style={styles.empty}>
                {atLimit
                  ? `You already have ${MAX_TILES} tiles. Remove one to add another.`
                  : 'All metrics are already on the board.'}
              </Text>
            ) : (
              availableToAdd.map((m) => (
                <Button
                  key={m.id}
                  mode="text"
                  contentStyle={styles.dialogRow}
                  onPress={() => {
                    addTile(m.id as MetricId);
                    setAddOpen(false);
                  }}>
                  {m.label}
                  {m.unit ? ` · ${m.unit}` : ''}
                </Button>
              ))
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setAddOpen(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%', minHeight: 0 },
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.md,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  hint: { opacity: 0.7 },
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
  empty: { textAlign: 'center', marginTop: space.lg, opacity: 0.7 },
  dialogScroll: { maxHeight: 360, paddingHorizontal: 0 },
  dialogRow: { justifyContent: 'flex-start', minHeight: 48 },
});
