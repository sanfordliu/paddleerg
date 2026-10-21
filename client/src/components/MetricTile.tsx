import { useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon, IconButton, Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';
import type { MetricDef } from '@/src/metrics/catalog';
import type { LiveMetrics } from '@/src/ble/types';

interface Props {
  def: MetricDef;
  metrics: LiveMetrics;
  editing: boolean;
  dragging?: boolean;
  dropTarget?: boolean;
  controlSize?: number;
  onLongPress?: () => void;
  onDelete?: () => void;
  /** Web pointer-drag: begin reorder from this tile (not the delete control). */
  onDragPointerDown?: (e: { clientX: number; clientY: number; pointerId: number }) => void;
}

function chromeTypeScale(width: number, height: number) {
  const cols = width < height ? 2 : width < 900 ? 2 : 3;
  const rows = Math.ceil(6 / cols);
  const cellH = (height - 100) / rows;
  const label = Math.round(Math.min(42, Math.max(20, cellH * 0.09)));
  const unit = Math.round(Math.min(36, Math.max(18, cellH * 0.075)));
  const control = Math.round(Math.min(56, Math.max(32, cellH * 0.12)));
  return { label, unit, control };
}

let measureCanvas: HTMLCanvasElement | null = null;

function measureTextWidth(text: string, fontSize: number): number {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    if (!measureCanvas) measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    if (ctx) {
      ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
      return ctx.measureText(text).width;
    }
  }
  return text.length * fontSize * 0.62;
}

function fitFontSize(text: string, boxW: number, boxH: number): number {
  if (boxW <= 0 || boxH <= 0 || !text) return 24;
  const maxByHeight = boxH * 0.8;
  const maxByWidthGuess = boxW * 0.98;
  let hi = Math.min(maxByHeight, maxByWidthGuess, 400);
  let lo = 12;
  if (measureTextWidth(text, hi) <= boxW * 0.98) {
    return Math.max(12, Math.floor(hi));
  }
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (measureTextWidth(text, mid) <= boxW * 0.98) lo = mid;
    else hi = mid;
  }
  return Math.max(12, Math.floor(lo));
}

export function MetricTile({
  def,
  metrics,
  editing,
  dragging,
  dropTarget,
  controlSize: controlSizeProp,
  onLongPress,
  onDelete,
  onDragPointerDown,
}: Props) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const display = def.format(def.getValue(metrics));
  const chrome = chromeTypeScale(width, height);
  const controlSize = controlSizeProp ?? chrome.control;
  const [valueBox, setValueBox] = useState({ width: 0, height: 0 });
  const valueFont = fitFontSize(display, valueBox.width, valueBox.height);

  const onValueLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (Math.abs(w - valueBox.width) > 1 || Math.abs(h - valueBox.height) > 1) {
      setValueBox({ width: w, height: h });
    }
  };

  const borderColor = dropTarget
    ? theme.colors.secondary
    : editing
      ? theme.colors.secondary
      : theme.colors.outlineVariant;

  const tileBody = (
    <Surface
      style={[
        styles.tile,
        editing && styles.tileEditing,
        {
          backgroundColor: theme.colors.surface,
          borderColor,
          borderStyle: editing ? 'dashed' : 'solid',
          borderWidth: dropTarget ? 2 : 1,
          paddingTop: editing ? controlSize + 12 : 16,
        },
      ]}
      elevation={1}
      mode="flat">
      {editing ? (
        <View
          style={[styles.dragHandle, { top: 10, left: 10 }]}
          pointerEvents="none"
          accessibilityLabel="Drag handle">
          <Icon source="drag" size={Math.round(controlSize * 0.7)} color={theme.colors.onSurface} />
        </View>
      ) : null}
      {editing && onDelete ? (
        <View
          {...(Platform.OS === 'web' ? ({ 'data-tile-delete': '1' } as object) : null)}
          style={styles.deleteWrap}>
          <IconButton
            icon="minus"
            size={Math.round(controlSize * 0.45)}
            mode="contained"
            containerColor={theme.colors.error}
            iconColor={theme.colors.onError}
            style={[
              styles.deleteBadge,
              {
                width: controlSize,
                height: controlSize,
                borderRadius: controlSize / 2,
              },
            ]}
            accessibilityLabel={`Remove ${def.label}`}
            onPress={onDelete}
          />
        </View>
      ) : null}

      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: theme.colors.onSurfaceVariant,
            fontSize: chrome.label,
            lineHeight: Math.round(chrome.label * 1.2),
          },
        ]}>
        {def.label}
      </Text>

      <View style={styles.valueWrap} onLayout={onValueLayout}>
        <Text
          numberOfLines={1}
          style={[
            styles.valueText,
            {
              color: theme.colors.onSurface,
              fontSize: valueFont,
              lineHeight: Math.round(valueFont * 1.05),
            },
          ]}>
          {display}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.unit,
          {
            color: theme.colors.onSurface,
            fontSize: chrome.unit,
            lineHeight: Math.round(chrome.unit * 1.2),
            opacity: def.unit ? 1 : 0,
          },
        ]}>
        {def.unit || ' '}
      </Text>
    </Surface>
  );

  if (editing) {
    return (
      <View
        style={[styles.pressable, styles.noSelect, styles.grab, dragging && styles.dragging]}
        accessibilityHint="Drag to reorder"
        {...(Platform.OS === 'web' && onDragPointerDown
          ? ({
              onPointerDown: (e: {
                button?: number;
                clientX: number;
                clientY: number;
                pointerId: number;
                preventDefault?: () => void;
                target?: { closest?: (s: string) => unknown };
              }) => {
                if (e.button != null && e.button !== 0) return;
                const t = e.target as { closest?: (s: string) => unknown } | undefined;
                if (t?.closest?.('button,[data-tile-delete]')) return;
                e.preventDefault?.();
                onDragPointerDown({
                  clientX: e.clientX,
                  clientY: e.clientY,
                  pointerId: e.pointerId,
                });
              },
            } as object)
          : {})}>
        {tileBody}
      </View>
    );
  }

  return (
    <TouchableRipple
      onLongPress={onLongPress}
      delayLongPress={350}
      style={styles.pressable}>
      {tileBody}
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    alignSelf: 'stretch',
  },
  noSelect: {
    ...(Platform.OS === 'web'
      ? ({
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        } as object)
      : null),
  },
  grab: {
    ...(Platform.OS === 'web' ? ({ cursor: 'grab' } as object) : null),
  },
  tile: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  tileEditing: {},
  dragging: { opacity: 0.35 },
  label: { fontWeight: '600', alignSelf: 'flex-start', flexShrink: 0 },
  valueWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
  },
  valueText: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    ...(Platform.OS === 'web'
      ? ({ whiteSpace: 'nowrap', textOverflow: 'clip', overflow: 'hidden' } as object)
      : null),
  },
  unit: { fontWeight: '500', alignSelf: 'flex-start', flexShrink: 0 },
  deleteWrap: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 3,
  },
  deleteBadge: {
    margin: 0,
  },
  dragHandle: {
    position: 'absolute',
    zIndex: 2,
  },
});
