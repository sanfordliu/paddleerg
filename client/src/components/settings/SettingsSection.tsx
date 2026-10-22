import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { space } from '@/src/theme';

interface Props {
  title?: string;
  hint?: string;
  trailing?: ReactNode;
  children: ReactNode;
}

/** M3 list section: primary-colored subheader, optional supporting text. */
export function SettingsSection({ title, hint, trailing, children }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.header}>
          <Text
            variant="titleSmall"
            style={[styles.title, { color: theme.colors.primary }]}>
            {title}
          </Text>
          {trailing}
        </View>
      ) : null}
      {hint ? (
        <Text
          variant="bodyMedium"
          style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          {hint}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: space.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginHorizontal: space.md,
    marginBottom: space.sm,
    minHeight: 32,
  },
  title: {
    fontWeight: '600',
  },
  hint: {
    marginHorizontal: space.md,
    marginBottom: space.md,
    lineHeight: 20,
  },
});
