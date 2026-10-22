import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Divider, List, Text, useTheme } from 'react-native-paper';
import { ConnectButton } from '@/src/components/ConnectButton';
import { DebugSection } from '@/src/components/DebugSection';
import { Notice } from '@/src/components/Notice';
import { ScreenPanel } from '@/src/components/ScreenPanel';
import { StravaConnectButton } from '@/src/components/StravaConnectButton';
import { useStravaStore } from '@/src/store/stravaStore';
import { useLayoutStore } from '@/src/store/layoutStore';
import { useWorkoutStore } from '@/src/store/workoutStore';
import { space } from '@/src/theme';

function SectionTitle({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      variant="titleMedium"
      style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
      {children}
    </Text>
  );
}

function ergStatusTitle(
  connected: boolean,
  reconnecting: boolean,
  name: string | null | undefined
): string {
  if (connected) return `ERG connected to ${name || 'device'}`;
  if (reconnecting) return `ERG reconnecting${name ? ` to ${name}` : ''}…`;
  return 'ERG not connected';
}

function hrStatusTitle(connected: boolean, name: string | null | undefined): string {
  if (connected) return `HR connected to ${name || 'monitor'}`;
  return 'HR not connected';
}

export default function SettingsScreen() {
  const theme = useTheme();
  const tokens = useStravaStore((s) => s.tokens);
  const hydrate = useStravaStore((s) => s.hydrate);
  const logout = useStravaStore((s) => s.logout);
  const resetLayout = useLayoutStore((s) => s.resetLayout);

  const connection = useWorkoutStore((s) => s.connection);
  const device = useWorkoutStore((s) => s.device);
  const hrConnection = useWorkoutStore((s) => s.hrConnection);
  const hrDevice = useWorkoutStore((s) => s.hrDevice);
  const error = useWorkoutStore((s) => s.error);
  const clearError = useWorkoutStore((s) => s.clearError);
  const disconnect = useWorkoutStore((s) => s.disconnect);
  const disconnectHr = useWorkoutStore((s) => s.disconnectHr);
  const connected = connection === 'connected';
  const reconnecting = connection === 'reconnecting';
  const hrConnected = hrConnection === 'connected';
  const hrBusy = hrConnection === 'connecting';

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ScreenPanel title="Settings" onClose={close} closeAccessibilityLabel="Close settings">
      <SectionTitle>Bluetooth</SectionTitle>
      <List.Item title={ergStatusTitle(connected, reconnecting, device?.name)} />
      <List.Item
        title={hrStatusTitle(hrConnected, hrDevice?.name)}
        description="BLE heart-rate straps (Polar, etc.). Apple Watch is not supported on web."
      />
      <View style={styles.actions}>
        {connected || reconnecting ? (
          <Button mode="outlined" textColor={theme.colors.error} onPress={() => void disconnect()}>
            Disconnect ERG
          </Button>
        ) : null}
        {hrConnected || hrBusy ? (
          <Button
            mode="outlined"
            textColor={theme.colors.error}
            onPress={() => void disconnectHr()}>
            Disconnect HR
          </Button>
        ) : null}
        {!connected ? (
          <ConnectButton kind="erg" label={reconnecting ? 'Choose ERG' : 'Connect ERG'} />
        ) : null}
        {!hrConnected && !hrBusy ? <ConnectButton kind="hr" /> : null}
        {error ? <Notice tone="error" message={error} onDismiss={clearError} /> : null}
      </View>

      <Divider style={styles.divider} />

      <SectionTitle>Strava</SectionTitle>
      <List.Item
        title={
          tokens
            ? `Connected${tokens.athlete?.firstname ? ` as ${tokens.athlete.firstname}` : ''}`
            : 'Not connected'
        }
      />
      <View style={styles.actions}>
        {tokens ? (
          <Button mode="outlined" textColor={theme.colors.error} onPress={() => void logout()}>
            Disconnect Strava
          </Button>
        ) : (
          <StravaConnectButton />
        )}
      </View>

      <Divider style={styles.divider} />

      <SectionTitle>Dashboard</SectionTitle>
      <View style={styles.actions}>
        <Button mode="outlined" textColor={theme.colors.onSurface} onPress={resetLayout}>
          Reset metric tiles
        </Button>
      </View>

      <Divider style={styles.divider} />

      <DebugSection />
    </ScreenPanel>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: space.lg,
    marginBottom: space.md,
    marginHorizontal: space.md,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: space.md,
    gap: space.sm,
    marginBottom: space.sm,
    alignItems: 'flex-start',
  },
  divider: {
    marginTop: space.md,
    marginHorizontal: space.md,
  },
});
