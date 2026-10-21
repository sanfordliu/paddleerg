import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon, IconButton, Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';
import type { MetricDef } from '@/src/metrics/catalog';
import type { LiveMetrics } from '@/src/ble/types';

interface Props {
  def: MetricDef;
  metrics: LiveMetrics;
  editing: boolean;
  onLongPress?: () => void;
  onDelete?: () => void;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
  dragging?: boolean;
}

/** Scale fonts from viewport so tall tiles get large numbers. */
function tileTypeScale(width: number, height: number) {
  // Approximate cell size for a 2×3 (portrait) or 3×2 (landscape) board.
  const cols = width < height ? 2 : width < 900 ? 2 : 3;
  const rows = Math.ceil(6 / cols);
  const cellW = width / cols;
  const cellH = (height - 100) / rows;
  const value = Math.round(Math.min(120, Math.max(36, Math.min(cellW * 0.28, cellH * 0.32))));
  const label = Math.round(Math.min(28, Math.max(14, value * 0.28)));
  const unit = Math.round(Math.min(24, Math.max(13, value * 0.22)));
  return { value, label, unit };
}

export function MetricTile({
  def,
  metrics,
  editing,
  onLongPress,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  dragging,
}: Props) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const display = def.format(def.getValue(metrics));
  const scale = tileTypeScale(width, height);

  return (
    <TouchableRipple
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[
        styles.pressable,
        dragging && styles.dragging,
        Platform.OS === 'web' && editing ? styles.draggable : null,
      ]}
      accessibilityHint={editing ? 'Drag to reorder' : undefined}
      {...(Platform.OS === 'web' && editing
        ? ({
            draggable: true,
            onDragStart: (e: {
              dataTransfer?: {
                setData?: (t: string, v: string) => void;
                effectAllowed?: string;
              };
            }) => {
              e.dataTransfer?.setData?.('text/plain', def.id);
              if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
              onDragStart?.();
            },
            onDragOver: (e: {
              preventDefault?: () => void;
              dataTransfer?: { dropEffect?: string };
            }) => {
              e.preventDefault?.();
              if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
              onDragOver?.();
            },
            onDrop: (e: { preventDefault?: () => void }) => {
              e.preventDefault?.();
              onDrop?.();
            },
            onDragEnd: () => onDrop?.(),
          } as object)
        : {})}>
      <Surface
        style={[
          styles.tile,
          editing && styles.tileEditing,
          {
            backgroundColor: theme.colors.surface,
            borderColor: editing ? theme.colors.secondary : theme.colors.outlineVariant,
            borderStyle: editing ? 'dashed' : 'solid',
          },
        ]}
        elevation={1}
        mode="flat">
        {editing ? (
          <View style={styles.dragHandle} pointerEvents="none">
            <Icon source="drag" size={18} color={theme.colors.onSurfaceVariant} />
          </View>
        ) : null}
        {editing && onDelete ? (
          <IconButton
            icon="minus"
            size={16}
            mode="contained"
            containerColor={theme.colors.error}
            iconColor={theme.colors.onError}
            style={styles.deleteBadge}
            accessibilityLabel={`Remove ${def.label}`}
            onPress={onDelete}
          />
        ) : null}

        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: theme.colors.onSurfaceVariant,
              fontSize: scale.label,
              lineHeight: Math.round(scale.label * 1.2),
            },
          ]}>
          {def.label}
        </Text>

        <View style={styles.valueWrap}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.value,
              {
                color: theme.colors.onSurface,
                fontSize: scale.value,
                lineHeight: Math.round(scale.value * 1.1),
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
              color: theme.colors.onSurfaceVariant,
              fontSize: scale.unit,
              lineHeight: Math.round(scale.unit * 1.2),
              opacity: def.unit ? 1 : 0,
            },
          ]}>
          {def.unit || ' '}
        </Text>
      </Surface>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    alignSelf: 'stretch',
  },
  tile: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  tileEditing: {
    paddingTop: 44,
  },
  dragging: { opacity: 0.55 },
  draggable: { cursor: 'grab' } as object,
  label: { fontWeight: '600', alignSelf: 'flex-start' },
  valueWrap: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
  },
  value: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { fontWeight: '500', alignSelf: 'flex-start' },
  deleteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    margin: 0,
    zIndex: 2,
  },
  dragHandle: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
});
