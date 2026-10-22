import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, Menu, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { space } from '@/src/theme';

export interface SelectMenuOption<T extends string = string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  options: readonly SelectMenuOption<T>[];
  onChange: (value: T) => void;
  /** Optional field label for a11y; defaults to the selected option label. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

/**
 * MD3-style exposed select: outlined field + menu of choices.
 * Uses theme onSurface / outline / elevation tokens for contrast and chrome.
 */
export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  style,
  disabled = false,
}: Props<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? value;

  const close = () => setOpen(false);

  return (
    <Menu
      visible={open}
      onDismiss={close}
      anchorPosition="bottom"
      contentStyle={[
        styles.menu,
        {
          backgroundColor: theme.colors.elevation.level2,
          borderRadius: theme.roundness,
        },
      ]}
      anchor={
        <TouchableRipple
          disabled={disabled}
          onPress={() => setOpen(true)}
          borderless={false}
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled }}
          accessibilityLabel={accessibilityLabel ?? label}
          style={[
            styles.anchor,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.roundness,
              opacity: disabled ? 0.38 : 1,
            },
            style,
          ]}>
          <View style={styles.anchorInner} pointerEvents="none">
            <Text
              variant="labelLarge"
              numberOfLines={1}
              style={[styles.anchorLabel, { color: theme.colors.onSurface }]}>
              {label}
            </Text>
            <Icon
              source={open ? 'menu-up' : 'menu-down'}
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
        </TouchableRipple>
      }>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Menu.Item
            key={option.value}
            title={option.label}
            accessibilityState={{ selected: isSelected }}
            leadingIcon={({ size, color }) =>
              isSelected ? (
                <Icon source="check" size={size} color={color} />
              ) : (
                <View style={{ width: size }} />
              )
            }
            titleStyle={{
              color: isSelected
                ? theme.colors.onSecondaryContainer
                : theme.colors.onSurface,
            }}
            style={[
              styles.item,
              isSelected && { backgroundColor: theme.colors.secondaryContainer },
            ]}
            onPress={() => {
              onChange(option.value);
              close();
            }}
          />
        );
      })}
    </Menu>
  );
}

const styles = StyleSheet.create({
  anchor: {
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  anchorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    // MD3 outlined button / field: 16dp horizontal, ~10dp vertical for 40dp height
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    gap: space.sm,
    minHeight: 40,
  },
  anchorLabel: {
    flexShrink: 1,
    letterSpacing: 0.1,
  },
  menu: {
    minWidth: 220,
    paddingVertical: space.sm,
  },
  item: {
    minWidth: 220,
  },
});
