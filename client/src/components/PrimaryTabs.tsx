import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

export interface PrimaryTab<T extends string> {
  key: T;
  label: string;
  icon?: string;
}

interface Props<T extends string> {
  tabs: readonly PrimaryTab<T>[];
  value: T;
  onChange: (key: T) => void;
}

/**
 * Material 3 primary tabs (fixed). Tap-only: no swipe, so tab content can host
 * its own drag gestures.
 */
export function PrimaryTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  const theme = useTheme();
  const withIcons = tabs.some((t) => t.icon);

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        const color = active ? theme.colors.primary : theme.colors.onSurfaceVariant;
        return (
          <TouchableRipple
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, { height: withIcons ? 64 : 48 }]}>
            <View style={styles.inner}>
              {tab.icon ? <Icon source={tab.icon} size={24} color={color} /> : null}
              <View style={styles.labelWrap}>
                <Text variant="titleSmall" numberOfLines={1} style={{ color }}>
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.indicator,
                    { backgroundColor: active ? theme.colors.primary : 'transparent' },
                  ]}
                />
              </View>
            </View>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    minWidth: 0,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  labelWrap: {
    alignItems: 'stretch',
  },
  indicator: {
    height: 3,
    marginTop: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});
