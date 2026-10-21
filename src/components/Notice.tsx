import { StyleSheet, View } from 'react-native';
import { HelperText, Icon, IconButton, useTheme } from 'react-native-paper';

export type NoticeTone = 'error' | 'warning' | 'info' | 'success';

interface Props {
  tone?: NoticeTone;
  message: string;
  onDismiss?: () => void;
}

/**
 * MD3 supporting / helper text for inline notices.
 * Prefer HelperText over Banner (Banner is a full-width action strip).
 */
export function Notice({ tone = 'error', message, onDismiss }: Props) {
  const theme = useTheme();
  if (!message) return null;

  const isError = tone === 'error' || tone === 'warning';
  const color = isError ? theme.colors.error : theme.colors.onSurfaceVariant;

  return (
    <View style={styles.row}>
      <Icon
        source={isError ? 'alert-circle-outline' : 'information-outline'}
        size={18}
        color={color}
      />
      <HelperText
        type={isError ? 'error' : 'info'}
        visible
        padding="none"
        style={[styles.text, { color }]}>
        {message}
      </HelperText>
      {onDismiss ? (
        <IconButton
          icon="close"
          size={16}
          onPress={onDismiss}
          accessibilityLabel="Dismiss"
          style={styles.dismiss}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  text: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
    paddingVertical: 0,
  },
  dismiss: {
    margin: 0,
    marginTop: -6,
  },
});
