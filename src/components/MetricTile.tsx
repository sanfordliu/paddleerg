import { Platform, StyleSheet, View } from 'react-native';
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
  const display = def.format(def.getValue(metrics));

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
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {def.label}
        </Text>
        <Text
          variant="displaySmall"
          numberOfLines={1}
          style={[styles.value, { color: theme.colors.onSurface }]}>
          {display}
        </Text>
        {def.unit ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {def.unit}
          </Text>
        ) : (
          <View style={styles.unitSpacer} />
        )}
      </Surface>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    maxWidth: 320,
  },
  tile: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    minHeight: 120,
    justifyContent: 'center',
    borderWidth: 1,
    gap: 4,
  },
  tileEditing: {
    paddingTop: 40,
  },
  dragging: { opacity: 0.55 },
  draggable: { cursor: 'grab' } as object,
  value: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  unitSpacer: { height: 17 },
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
