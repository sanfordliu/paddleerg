import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, useTheme } from 'react-native-paper';
import { ScreenPanel } from '@/src/components/ScreenPanel';

interface ScreenOverlayProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeAccessibilityLabel?: string;
  scroll?: boolean;
}

/** Full-screen takeover overlay with the same chrome as Settings. */
export function ScreenOverlay({
  visible,
  title,
  onClose,
  children,
  closeAccessibilityLabel,
  scroll,
}: ScreenOverlayProps) {
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
