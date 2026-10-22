import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text, useTheme, type MD3Theme } from 'react-native-paper';
import { space } from '@/src/theme';

export type NoticeTone = 'error' | 'warning' | 'info' | 'success';

interface Props {
  tone?: NoticeTone;
  message: string;
  onDismiss?: () => void;
}

function toneColors(
  tone: NoticeTone,
  theme: MD3Theme
): { bg: string; fg: string; icon: string } {
  switch (tone) {
    case 'error':
      return {
        bg: theme.colors.errorContainer,
        fg: theme.colors.onErrorContainer,
        icon: 'alert-circle-outline',
      };
    case 'warning':
      return {
        bg: theme.colors.secondaryContainer,
        fg: theme.colors.onSecondaryContainer,
        icon: 'alert-outline',
      };
    case 'success':
      return {
        bg: theme.colors.tertiaryContainer,
        fg: theme.colors.onTertiaryContainer,
        icon: 'check-circle-outline',
      };
    default:
      return {
        bg: theme.colors.surfaceVariant,
        fg: theme.colors.onSurfaceVariant,
        icon: 'information-outline',
      };
  }
}

/** Compact MD3 status banner for feedback inside panels and modals. */
export function Notice({ tone = 'info', message, onDismiss }: Props) {
  const theme = useTheme();
  if (!message) return null;

  const colors = toneColors(tone, theme);

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.bg, borderRadius: theme.roundness }]}
      accessibilityRole="alert">
      <Icon source={colors.icon} size={20} color={colors.fg} />
      <Text variant="bodyMedium" style={[styles.text, { color: colors.fg }]}>
        {message}
      </Text>
      {onDismiss ? (
        <IconButton
          icon="close"
          size={18}
          iconColor={colors.fg}
          onPress={onDismiss}
          accessibilityLabel="Dismiss"
          style={styles.dismiss}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    alignSelf: 'stretch',
  },
  text: {
    flex: 1,
    lineHeight: 22,
    paddingTop: 1,
  },
  dismiss: {
    margin: 0,
    marginTop: -6,
    marginRight: -8,
  },
});
