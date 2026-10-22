import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type View as RNView } from 'react-native';
import { Button, Chip, Icon, Portal, Switch, Text, useTheme } from 'react-native-paper';
import { SettingsSection } from '@/src/components/settings/SettingsSection';
import { METRIC_CATALOG, getMetricDef, type MetricId } from '@/src/metrics/catalog';
import { MAX_TILES, useLayoutStore } from '@/src/store/layoutStore';
import { space } from '@/src/theme';

type RowHost = RNView & {
  getBoundingClientRect?: () => DOMRect;
};

type DragPreview = {
  id: MetricId;
  width: number;
  height: number;
  x: number;
  y: number;
};

function MetricLabel({ id }: { id: MetricId }) {
  const theme = useTheme();
  const def = getMetricDef(id);
  return (
    <View style={styles.label} pointerEvents="none">
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
        {def.label}
      </Text>
      {def.unit ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {def.unit}
        </Text>
      ) : null}
    </View>
  );
}

/** Choose which metrics appear on the workout screen and in what order. */
export function DisplayTab() {
  const theme = useTheme();
  const tileIds = useLayoutStore((s) => s.tileIds);
  const addTile = useLayoutStore((s) => s.addTile);
  const removeTile = useLayoutStore((s) => s.removeTile);
  const resetLayout = useLayoutStore((s) => s.resetLayout);

  const [dragId, setDragId] = useState<MetricId | null>(null);
  const [overId, setOverId] = useState<MetricId | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);

  const dragIdRef = useRef<MetricId | null>(null);
  const grabOffsetRef = useRef({ x: 0, y: 0 });
  const rowRefs = useRef<Partial<Record<MetricId, RowHost | null>>>({});

  const atLimit = tileIds.length >= MAX_TILES;
  const offIds = METRIC_CATALOG.map((m) => m.id).filter((id) => !tileIds.includes(id));

  useEffect(() => {
    if (!dragId || Platform.OS !== 'web') return;

    const moveOnto = (fromId: MetricId, toId: MetricId) => {
      const { tileIds: ids, reorder } = useLayoutStore.getState();
      const from = ids.indexOf(fromId);
      const to = ids.indexOf(toId);
      if (from < 0 || to < 0 || from === to) return;
      reorder(from, to);
    };

    const rowAtPoint = (clientY: number): MetricId | null => {
      for (const id of useLayoutStore.getState().tileIds) {
        const rect = rowRefs.current[id]?.getBoundingClientRect?.();
        if (rect && clientY >= rect.top && clientY <= rect.bottom) return id;
      }
      return null;
    };

    const clearDrag = () => {
      dragIdRef.current = null;
      setDragId(null);
      setOverId(null);
      setPreview(null);
    };

    const onMove = (e: PointerEvent) => {
      const from = dragIdRef.current;
      if (!from) return;
      e.preventDefault();
      const { x: ox, y: oy } = grabOffsetRef.current;
      setPreview((prev) =>
        prev ? { ...prev, x: e.clientX - ox, y: e.clientY - oy } : prev
      );
      const target = rowAtPoint(e.clientY);
      if (!target || target === from) {
        setOverId(null);
        return;
      }
      setOverId(target);
      moveOnto(from, target);
    };

    const onUp = () => clearDrag();

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragId]);

  const previewDef = preview ? getMetricDef(preview.id) : null;

  return (
    <View>
      <View style={styles.intro}>
        <Text
          variant="bodyMedium"
          style={[styles.introText, { color: theme.colors.onSurfaceVariant }]}>
          Choose up to {MAX_TILES} metrics for the workout screen. Drag to reorder.
        </Text>
        <Chip compact mode="outlined" style={styles.counter}>
          {`${tileIds.length}/${MAX_TILES}`}
        </Chip>
      </View>

      <SettingsSection title="Shown">
        {tileIds.length === 0 ? (
          <Text
            variant="bodyMedium"
            style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            No metrics shown. Turn some on below.
          </Text>
        ) : null}
        {tileIds.map((id) => {
          const def = getMetricDef(id);
          const isDragging = dragId === id;
          const isDragOver = overId === id && dragId !== id;
          return (
            <View
              key={id}
              ref={(node) => {
                rowRefs.current[id] = node as RowHost | null;
              }}
              style={[
                styles.row,
                {
                  borderRadius: theme.roundness,
                  backgroundColor: isDragOver
                    ? theme.colors.secondaryContainer
                    : isDragging
                      ? theme.colors.surfaceVariant
                      : 'transparent',
                  opacity: isDragging ? 0.35 : 1,
                },
              ]}>
              <View
                style={[styles.dragZone, Platform.OS === 'web' ? styles.dragZoneWeb : null]}
                accessibilityLabel={`Drag to reorder ${def.label}`}
                onPointerDown={(e) => {
                  if (Platform.OS !== 'web') return;
                  if ('button' in e && typeof e.button === 'number' && e.button !== 0) return;
                  e.preventDefault?.();
                  const native = e.nativeEvent as {
                    clientX?: number;
                    clientY?: number;
                    pointerId?: number;
                  };
                  const target = e.currentTarget as unknown as {
                    setPointerCapture?: (pointerId: number) => void;
                    getBoundingClientRect?: () => DOMRect;
                  };
                  const rect = rowRefs.current[id]?.getBoundingClientRect?.();
                  if (!rect) return;
                  if (native.pointerId != null) target.setPointerCapture?.(native.pointerId);
                  const clientX = native.clientX ?? rect.left;
                  const clientY = native.clientY ?? rect.top;
                  grabOffsetRef.current = { x: clientX - rect.left, y: clientY - rect.top };
                  dragIdRef.current = id;
                  setDragId(id);
                  setOverId(null);
                  setPreview({
                    id,
                    width: rect.width,
                    height: rect.height,
                    x: rect.left,
                    y: rect.top,
                  });
                }}>
                <View style={styles.handle}>
                  <Icon
                    source="drag"
                    size={22}
                    color={isDragging ? theme.colors.secondary : theme.colors.onSurfaceVariant}
                  />
                </View>
                <MetricLabel id={id} />
              </View>
              <Switch value onValueChange={() => removeTile(id)} />
            </View>
          );
        })}
      </SettingsSection>

      <SettingsSection
        title="Available"
        hint={atLimit ? `${MAX_TILES} metrics shown. Turn one off to add another.` : undefined}>
        {offIds.map((id) => (
          <View key={id} style={styles.row}>
            <View style={styles.dragZone}>
              <View style={styles.handle} />
              <MetricLabel id={id} />
            </View>
            <Switch value={false} disabled={atLimit} onValueChange={() => addTile(id)} />
          </View>
        ))}
      </SettingsSection>

      <Button
        mode="outlined"
        textColor={theme.colors.onSurface}
        onPress={resetLayout}
        style={styles.reset}>
        Reset to defaults
      </Button>

      {preview && previewDef && Platform.OS === 'web' ? (
        <Portal>
          <View
            pointerEvents="none"
            style={[
              styles.preview,
              {
                left: preview.x,
                top: preview.y,
                width: preview.width,
                height: preview.height,
                borderRadius: theme.roundness,
                backgroundColor: theme.colors.elevation.level3,
                borderColor: theme.colors.outline,
              },
            ]}>
            <View style={styles.handle}>
              <Icon source="drag" size={22} color={theme.colors.secondary} />
            </View>
            <MetricLabel id={preview.id} />
          </View>
        </Portal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.md,
    marginBottom: space.lg,
  },
  introText: {
    flex: 1,
    lineHeight: 20,
  },
  counter: {
    flexShrink: 0,
  },
  empty: {
    marginHorizontal: space.md,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.xs,
    paddingVertical: space.sm,
    paddingRight: space.sm,
    gap: space.xs,
  },
  dragZone: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 40,
  },
  dragZoneWeb: {
    ...(Platform.OS === 'web'
      ? ({ cursor: 'grab', userSelect: 'none', touchAction: 'none' } as object)
      : null),
  },
  handle: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  label: {
    flex: 1,
    gap: 2,
  },
  reset: {
    alignSelf: 'flex-start',
    marginHorizontal: space.md,
  },
  preview: {
    position: 'absolute',
    zIndex: 3000,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: space.sm,
    gap: space.xs,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.96,
    elevation: 12,
    ...(Platform.OS === 'web'
      ? ({
          position: 'fixed',
          boxShadow: '0 10px 28px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        } as object)
      : null),
  },
});
