import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { MetricTile } from '@/src/components/MetricTile';
import { METRIC_CATALOG, getMetricDef, type MetricId } from '@/src/metrics/catalog';
import { useLayoutStore } from '@/src/store/layoutStore';
import type { LiveMetrics } from '@/src/ble/types';
import { space } from '@/src/theme';

interface Props {
  metrics: LiveMetrics;
}

export function MetricGrid({ metrics }: Props) {
  const { width } = useWindowDimensions();
  const tileIds = useLayoutStore((s) => s.tileIds);
  const editing = useLayoutStore((s) => s.editing);
  const setEditing = useLayoutStore((s) => s.setEditing);
  const reorder = useLayoutStore((s) => s.reorder);
  const removeTile = useLayoutStore((s) => s.removeTile);
  const addTile = useLayoutStore((s) => s.addTile);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const columns = width >= 900 ? 3 : 2;
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
            disabled={availableToAdd.length === 0}
            onPress={() => setAddOpen(true)}>
            Add metric
          </Button>
          <Text variant="bodySmall" style={styles.hint}>
            Drag tiles to reorder
          </Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {tileIds.map((id, index) => {
          const def = getMetricDef(id);
          const tileWidth = columns === 3 ? '31.5%' : '48%';
          return (
            <View key={id} style={{ width: tileWidth as `${number}%`, flexGrow: 1, minWidth: 140 }}>
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
            {availableToAdd.length === 0 ? (
              <Text variant="bodyMedium" style={styles.empty}>
                All metrics are already on the board.
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
  wrap: { width: '100%' },
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.md,
    flexWrap: 'wrap',
  },
  hint: { opacity: 0.7 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: space.md,
  },
  empty: { textAlign: 'center', marginTop: space.lg, opacity: 0.7 },
  dialogScroll: { maxHeight: 360, paddingHorizontal: 0 },
  dialogRow: { justifyContent: 'flex-start', minHeight: 48 },
});
