import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, List, Portal, Text, useTheme } from 'react-native-paper';
import { BandEditor } from '@/src/components/BandEditor';
import { MetricTile } from '@/src/components/MetricTile';
import { AppModal } from '@/src/components/AppModal';
import { isBandableMetricId, type BandableMetricId } from '@/src/metrics/bands';
import { METRIC_CATALOG, getMetricDef, type MetricId } from '@/src/metrics/catalog';
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

/** Hit-test tile cells by geometry (ignores ghost overlays that block elementFromPoint). */
function tileIdAtPoint(clientX: number, clientY: number, excludeId?: MetricId | null): MetricId | null {
  if (typeof document === 'undefined') return null;
  const nodes = document.querySelectorAll('[data-tile-id]');

  for (let i = 0; i < nodes.length; i++) {
    const host = nodes[i] as HTMLElement;
    const id = (host.getAttribute('data-tile-id') ?? host.dataset?.tileId) as MetricId | undefined;
    if (!id || id === excludeId) continue;
    const r = host.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      return id;
    }
  }
  return null;
}

export function MetricGrid({ metrics }: Props) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const tileIds = useLayoutStore((s) => s.tileIds);
  const editing = useLayoutStore((s) => s.editing);
  const setEditing = useLayoutStore((s) => s.setEditing);
  const swapById = useLayoutStore((s) => s.swapById);
  const removeTile = useLayoutStore((s) => s.removeTile);
  const addTile = useLayoutStore((s) => s.addTile);

  const [draggingId, setDraggingId] = useState<MetricId | null>(null);
  const [overId, setOverId] = useState<MetricId | null>(null);
  const [ghost, setGhost] = useState<{
    id: MetricId;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bandEditId, setBandEditId] = useState<BandableMetricId | null>(null);

  const draggingIdRef = useRef<MetricId | null>(null);
  const lastSwapTargetRef = useRef<MetricId | null>(null);
  const pointerOffset = useRef({ x: 0, y: 0 });
  const cellSizeRef = useRef({ w: 200, h: 160 });

  const visibleIds = tileIds.slice(0, MAX_TILES);
  const columns = columnCount(width, height, visibleIds.length);
  const rows = chunk(visibleIds, columns);
  const atLimit = tileIds.length >= MAX_TILES;
  const controlSize = controlSizeForWindow(width, height);

  const availableToAdd = useMemo(
    () => METRIC_CATALOG.filter((m) => !tileIds.includes(m.id)),
    [tileIds]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !draggingId) return;

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const applyHover = (clientX: number, clientY: number) => {
      const id = draggingIdRef.current;
      if (!id) return;
      setGhost({
        id,
        x: clientX - pointerOffset.current.x,
        y: clientY - pointerOffset.current.y,
        w: cellSizeRef.current.w,
        h: cellSizeRef.current.h,
      });

      const targetId = tileIdAtPoint(clientX, clientY, id);
      if (!targetId) {
        // Over empty space / the dragged tile's own cell — allow re-entering later.
        lastSwapTargetRef.current = null;
        setOverId(null);
        return;
      }
      if (targetId === lastSwapTargetRef.current) {
        setOverId(targetId);
        return;
      }
      lastSwapTargetRef.current = targetId;
      setOverId(targetId);
      swapById(id, targetId);
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      applyHover(e.clientX, e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      const id = draggingIdRef.current;
      if (id) {
        const targetId = tileIdAtPoint(e.clientX, e.clientY, id);
        if (targetId && targetId !== lastSwapTargetRef.current) {
          swapById(id, targetId);
        }
      }
      draggingIdRef.current = null;
      lastSwapTargetRef.current = null;
      setDraggingId(null);
      setOverId(null);
      setGhost(null);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [draggingId, swapById]);

  const startDrag = (id: MetricId, e: { clientX: number; clientY: number }) => {
    if (Platform.OS !== 'web') return;
    const host = document.querySelector(`[data-tile-id="${id}"]`) as HTMLElement | null;
    const rect = host?.getBoundingClientRect();
    if (rect) {
      cellSizeRef.current = { w: rect.width, h: rect.height };
      pointerOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    } else {
      pointerOffset.current = { x: cellSizeRef.current.w / 2, y: cellSizeRef.current.h / 2 };
    }
    draggingIdRef.current = id;
    lastSwapTargetRef.current = null;
    setDraggingId(id);
    setOverId(null);
    setGhost({
      id,
      x: e.clientX - pointerOffset.current.x,
      y: e.clientY - pointerOffset.current.y,
      w: cellSizeRef.current.w,
      h: cellSizeRef.current.h,
    });
  };

  const ghostDef = ghost ? getMetricDef(ghost.id) : null;

  return (
    <View style={styles.wrap}>
      {editing ? (
        <View style={styles.editBar}>
          <Button
            mode="contained"
            icon="plus"
            disabled={availableToAdd.length === 0 && !atLimit}
            onPress={() => setAddOpen(true)}>
            Add metric
          </Button>
          {atLimit ? null : (
            <Text variant="bodySmall" style={styles.hint}>
              Drag a tile onto another to swap
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((id) => {
              const def = getMetricDef(id);
              return (
                <View
                  key={id}
                  {...(Platform.OS === 'web'
                    ? ({ 'data-tile-id': id, dataSet: { tileId: id } } as object)
                    : null)}
                  style={styles.cell}>
                  <MetricTile
                    def={def}
                    metrics={metrics}
                    editing={editing}
                    dragging={draggingId === id}
                    dropTarget={overId === id && draggingId !== id}
                    controlSize={controlSize}
                    onLongPress={() => setEditing(true)}
                    onDelete={draggingId ? undefined : () => removeTile(id)}
                    onPress={
                      isBandableMetricId(id) ? () => setBandEditId(id) : undefined
                    }
                    onDragPointerDown={(e) => startDrag(id, e)}
                  />
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

      {editing && tileIds.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>
          No metrics on the board. Tap Add to choose some.
        </Text>
      ) : null}

      {Platform.OS === 'web' && ghost && ghostDef ? (
        <Portal>
          <View
            pointerEvents="none"
            style={[
              styles.ghost,
              {
                left: ghost.x,
                top: ghost.y,
                width: ghost.w,
                height: ghost.h,
              },
            ]}>
            <View
              style={[
                styles.ghostInner,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.secondary,
                },
              ]}>
              <MetricTile
                def={ghostDef}
                metrics={metrics}
                editing
                controlSize={controlSize}
              />
            </View>
          </View>
        </Portal>
      ) : null}

      <AppModal
        visible={addOpen}
        title="Add metric"
        onClose={() => setAddOpen(false)}
        closeAccessibilityLabel="Close add metric">
        {availableToAdd.length === 0 || atLimit ? (
          <Text variant="bodyLarge" style={styles.empty}>
            {atLimit
              ? `You already have ${MAX_TILES} tiles. Remove one to add another.`
              : 'All metrics are already on the board.'}
          </Text>
        ) : (
          availableToAdd.map((m) => (
            <List.Item
              key={m.id}
              title={m.label}
              description={m.unit || undefined}
              onPress={() => {
                addTile(m.id as MetricId);
                setAddOpen(false);
              }}
              right={(props) => <List.Icon {...props} icon="plus" />}
            />
          ))
        )}
      </AppModal>

      <BandEditor
        metricId={bandEditId}
        visible={bandEditId != null}
        onClose={() => setBandEditId(null)}
      />
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
  ghost: {
    ...(Platform.OS === 'web'
      ? ({
          position: 'fixed' as const,
          zIndex: 10000,
          pointerEvents: 'none',
          opacity: 0.95,
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        } as object)
      : { position: 'absolute', zIndex: 10000 }),
  },
  ghostInner: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  empty: {
    textAlign: 'left',
    marginTop: space.lg,
    marginHorizontal: space.md,
    opacity: 0.85,
    lineHeight: 24,
  },
});
