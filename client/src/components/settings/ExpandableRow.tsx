import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, View, type HostInstance } from 'react-native';
import { Icon, Switch, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { space } from '@/src/theme';

interface Props {
  title: string;
  description: string;
  leading?: ReactNode;
  custom?: boolean;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  children: ReactNode;
}

/** M3 list item that expands in place to reveal an inline editor. */
export const ExpandableRow = forwardRef<HostInstance, Props>(function ExpandableRow(
  {
    title,
    description,
    leading,
    custom,
    enabled,
    onEnabledChange,
    expanded,
    onToggleExpanded,
    children,
  },
  ref
) {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.wrap,
        {
          borderRadius: theme.roundness,
          backgroundColor: expanded ? theme.colors.elevation.level1 : 'transparent',
          borderColor: expanded ? theme.colors.outlineVariant : 'transparent',
        },
      ]}>
      <View style={styles.header}>
        <TouchableRipple
          onPress={onToggleExpanded}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${title}, ${description}`}
          style={[styles.headerPress, { borderRadius: theme.roundness }]}>
          <View style={styles.headerInner}>
            {leading ? <View style={styles.leading}>{leading}</View> : null}
            <View style={styles.text}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                {title}
              </Text>
              <Text
                variant="bodyMedium"
                numberOfLines={1}
                style={{ color: theme.colors.onSurfaceVariant }}>
                {description}
              </Text>
            </View>
            {custom ? (
              <Text variant="labelMedium" style={{ color: theme.colors.secondary }}>
                Custom
              </Text>
            ) : null}
            <Icon
              source={expanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
        </TouchableRipple>
        <Switch
          value={enabled}
          onValueChange={onEnabledChange}
          accessibilityLabel={`${title} ${enabled ? 'on' : 'off'}`}
        />
      </View>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: space.xs,
    marginBottom: space.xs,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingRight: space.md,
  },
  headerPress: {
    flex: 1,
    minWidth: 0,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingLeft: space.md,
    paddingRight: space.xs,
    minHeight: 56,
  },
  leading: {
    width: 40,
    alignItems: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  body: {
    paddingHorizontal: space.md,
    paddingBottom: space.md,
    paddingTop: space.xs,
    gap: space.md,
  },
});
