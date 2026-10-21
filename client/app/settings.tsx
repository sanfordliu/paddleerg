import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Appbar,
  Button,
  Divider,
  List,
  RadioButton,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { ConnectButton } from '@/src/components/ConnectButton';
import { DebugSection } from '@/src/components/DebugSection';
import { Notice } from '@/src/components/Notice';
import { StravaConnectButton } from '@/src/components/StravaConnectButton';
import { STRAVA_SPORT_OPTIONS, useStravaStore } from '@/src/store/stravaStore';
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

export default function SettingsScreen() {
  const theme = useTheme();
  const tokens = useStravaStore((s) => s.tokens);
  const sportType = useStravaStore((s) => s.sportType);
  const hydrate = useStravaStore((s) => s.hydrate);
  const logout = useStravaStore((s) => s.logout);
  const setSportType = useStravaStore((s) => s.setSportType);
  const resetLayout = useLayoutStore((s) => s.resetLayout);

  const connection = useWorkoutStore((s) => s.connection);
  const device = useWorkoutStore((s) => s.device);
  const error = useWorkoutStore((s) => s.error);
  const clearError = useWorkoutStore((s) => s.clearError);
  const disconnect = useWorkoutStore((s) => s.disconnect);
  const connected = connection === 'connected';
  const reconnecting = connection === 'reconnecting';

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}>
      <Appbar.Header elevated={false} style={{ backgroundColor: theme.colors.background }} statusBarHeight={0}>
        <Appbar.Content title="Settings" titleStyle={styles.appbarTitle} />
        <Appbar.Action icon="close" accessibilityLabel="Close settings" onPress={close} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionTitle>Bluetooth</SectionTitle>
        <List.Item
          title={
            connected
              ? `Connected to ${device?.name || 'device'}`
              : reconnecting
                ? `Reconnecting${device?.name ? ` to ${device.name}` : ''}…`
                : 'Not connected'
          }
        />
        <View style={styles.actions}>
          {connected || reconnecting ? (
            <Button mode="outlined" textColor={theme.colors.error} onPress={() => void disconnect()}>
              Disconnect
            </Button>
          ) : null}
          {!connected ? <ConnectButton label={reconnecting ? 'Choose Device' : 'Connect'} /> : null}
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

        <SectionTitle>Sport type</SectionTitle>
        <RadioButton.Group
          onValueChange={(value) => setSportType(value as typeof sportType)}
          value={sportType}>
          <View style={styles.sportList}>
            {STRAVA_SPORT_OPTIONS.map((sport) => {
              const selected = sportType === sport.value;
              return (
                <TouchableRipple
                  key={sport.value}
                  onPress={() => setSportType(sport.value)}
                  style={styles.sportRow}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={sport.label}>
                  <View style={styles.sportRowInner}>
                    <RadioButton value={sport.value} status={selected ? 'checked' : 'unchecked'} />
                    <Text variant="bodyLarge">{sport.label}</Text>
                  </View>
                </TouchableRipple>
              );
            })}
          </View>
        </RadioButton.Group>

        <Divider style={styles.divider} />

        <SectionTitle>Dashboard</SectionTitle>
        <View style={styles.actions}>
          <Button mode="outlined" onPress={resetLayout}>
            Reset metric tiles
          </Button>
        </View>

        <Divider style={styles.divider} />

        <DebugSection />
      </ScrollView>
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
  sportList: {
    paddingHorizontal: space.sm,
    gap: 0,
  },
  sportRow: {
    alignSelf: 'flex-start',
    borderRadius: 8,
  },
  sportRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: space.md,
    gap: 4,
  },
  divider: {
    marginTop: space.md,
    marginHorizontal: space.md,
  },
});
