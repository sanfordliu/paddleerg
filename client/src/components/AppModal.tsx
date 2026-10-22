import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, useTheme } from 'react-native-paper';
import { ScreenPanel } from '@/src/components/ScreenPanel';

interface AppModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeAccessibilityLabel?: string;
  scroll?: boolean;
}

/**
 * Standard full-screen takeover modal (Settings, Add metric, bands, Share).
 * Same chrome as ScreenPanel; presented over the current screen via Portal.
 */
export function AppModal({
  visible,
  title,
  onClose,
  children,
  closeAccessibilityLabel,
  scroll,
}: AppModalProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <Portal>
      <View
        style={[styles.fill, { backgroundColor: theme.colors.background }]}
        accessibilityViewIsModal>
        <ScreenPanel
          title={title}
          onClose={onClose}
          closeAccessibilityLabel={closeAccessibilityLabel}
          scroll={scroll}>
          {children}
        </ScreenPanel>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
});
