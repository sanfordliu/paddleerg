import { Linking, Platform, StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { Notice } from '@/src/components/Notice';
import { API_URL } from '@/src/strava/config';
import { useStravaStore } from '@/src/store/stravaStore';
import { accents, space } from '@/src/theme';

function isErrorStatus(status: string): boolean {
  return /missing|error|fail|mismatch/i.test(status) || status.startsWith('Upload error');
}

/** Shared Strava OAuth connect control + inline config/status notices. */
export function StravaConnectButton() {
  const beginOAuth = useStravaStore((s) => s.beginOAuth);
  const status = useStravaStore((s) => s.status);
  const clearStatus = useStravaStore((s) => s.clearStatus);
  const setStatus = useStravaStore((s) => s.setStatus);
  const missingApi = !API_URL;

  const onPress = () => {
    try {
      const url = beginOAuth();
      if (Platform.OS === 'web') window.location.href = url;
      else void Linking.openURL(url);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.wrap}>
      <Button
        mode="contained"
        buttonColor={accents.strava}
        icon={({ size, color }) => <FontAwesome5 name="strava" size={size} color={color} />}
        disabled={missingApi}
        onPress={onPress}>
        Connect Strava
      </Button>
      {missingApi ? (
        <Notice
          tone="error"
          message="Missing API URL. Add EXPO_PUBLIC_API_URL to client/.env and restart the app."
        />
      ) : null}
      {status ? (
        <Notice
          tone={isErrorStatus(status) ? 'error' : 'info'}
          message={status}
          onDismiss={clearStatus}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    gap: space.sm,
  },
});
