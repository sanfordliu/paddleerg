import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, useTheme } from 'react-native-paper';
import { space } from '@/src/theme';

interface ScreenPanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeAccessibilityLabel?: string;
  /** When false, children are not wrapped in a ScrollView (caller manages scroll). */
  scroll?: boolean;
}

/** Full-screen panel chrome matching Settings: safe area, title, close. */
export function ScreenPanel({
  title,
  onClose,
  children,
  closeAccessibilityLabel,
  scroll = true,
}: ScreenPanelProps) {
  const theme = useTheme();

  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={styles.body}>{children}</View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}>
      <Appbar.Header
        elevated={false}
        style={{ backgroundColor: theme.colors.background }}
        statusBarHeight={0}>
        <Appbar.Content title={title} titleStyle={styles.appbarTitle} />
        <Appbar.Action
          icon="close"
          accessibilityLabel={closeAccessibilityLabel ?? `Close ${title}`}
          onPress={onClose}
        />
      </Appbar.Header>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  appbarTitle: { fontWeight: '600' },
  scroll: {
    paddingBottom: 48,
    paddingHorizontal: space.sm,
  },
  body: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: space.sm,
  },
});
