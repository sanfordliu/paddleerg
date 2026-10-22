import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Divider, List, Text, TextInput, useTheme } from 'react-native-paper';
import { ConnectButton } from '@/src/components/ConnectButton';
import { DebugSection } from '@/src/components/DebugSection';
import { Notice } from '@/src/components/Notice';
import { ScreenPanel } from '@/src/components/ScreenPanel';
import { SelectMenu } from '@/src/components/SelectMenu';
import { StravaConnectButton } from '@/src/components/StravaConnectButton';
import { ageFromBirthYear } from '@/src/metrics/bandDefaults';
import {
  useAthleteStore,
  type AthleteGender,
  type FitnessLevel,
} from '@/src/store/athleteStore';
import { useStravaStore } from '@/src/store/stravaStore';
import { useLayoutStore } from '@/src/store/layoutStore';
import { useWorkoutStore } from '@/src/store/workoutStore';
import { space } from '@/src/theme';

const GENDER_OPTIONS: { value: AthleteGender; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other / prefer not to say' },
];

const FITNESS_OPTIONS: { value: FitnessLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

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

function hrStatusTitle(
  connected: boolean,
  reconnecting: boolean,
  name: string | null | undefined
): string {
  if (connected) return `HR connected to ${name || 'monitor'}`;
  if (reconnecting) return `HR reconnecting${name ? ` to ${name}` : ''}…`;
  return 'HR not connected';
}

export default function SettingsScreen() {
  const theme = useTheme();
  const tokens = useStravaStore((s) => s.tokens);
  const sportType = useStravaStore((s) => s.sportType);
  const hydrate = useStravaStore((s) => s.hydrate);
  const logout = useStravaStore((s) => s.logout);
  const resetLayout = useLayoutStore((s) => s.resetLayout);

  const profile = useAthleteStore((s) => s.profile);
  const setProfile = useAthleteStore((s) => s.setProfile);
  const applyDefaults = useAthleteStore((s) => s.applyDefaults);

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
  const hrReconnecting = hrConnection === 'reconnecting';
  const hrBusy = hrConnection === 'connecting';

  const [birthYearText, setBirthYearText] = useState(
    profile.birthYear != null ? String(profile.birthYear) : ''
  );

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    setBirthYearText(profile.birthYear != null ? String(profile.birthYear) : '');
  }, [profile.birthYear]);

  const age = useMemo(() => ageFromBirthYear(profile.birthYear), [profile.birthYear]);

  const commitBirthYear = () => {
    const t = birthYearText.trim();
    if (!t) {
      setProfile({ birthYear: null });
      applyDefaults(sportType, false);
      return;
    }
    const y = Number(t);
    if (!Number.isFinite(y) || y < 1900 || y > new Date().getFullYear()) return;
    setProfile({ birthYear: Math.round(y) });
    applyDefaults(sportType, false);
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ScreenPanel title="Settings" onClose={close} closeAccessibilityLabel="Close settings">
      <SectionTitle>Athlete profile</SectionTitle>
      <Text
        variant="bodySmall"
        style={[styles.profileHint, { color: theme.colors.onSurfaceVariant }]}>
        Used to suggest green / yellow / red bands for SPM, pace, power, and heart rate. Changing
        profile updates bands you have not customized. Heuristics only — not medical advice.
      </Text>
      <View style={styles.profileFields}>
        <TextInput
          mode="outlined"
          label="Birth year"
          value={birthYearText}
          onChangeText={setBirthYearText}
          onBlur={commitBirthYear}
          onSubmitEditing={commitBirthYear}
          keyboardType="number-pad"
          style={styles.field}
        />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Age: {age != null ? age : '—'}
        </Text>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
          Gender
        </Text>
        <SelectMenu
          value={(profile.gender ?? 'other') as AthleteGender}
          options={GENDER_OPTIONS}
          onChange={(value) => {
            setProfile({ gender: value });
            applyDefaults(sportType, false);
          }}
          accessibilityLabel="Gender"
        />
        <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
          Fitness level
        </Text>
        <SelectMenu
          value={profile.fitnessLevel}
          options={FITNESS_OPTIONS}
          onChange={(value) => {
            setProfile({ fitnessLevel: value });
            applyDefaults(sportType, false);
          }}
          accessibilityLabel="Fitness level"
        />
        <Button
          mode="outlined"
          textColor={theme.colors.onSurface}
          onPress={() => applyDefaults(sportType, true)}>
          Reset all bands to profile defaults
        </Button>
      </View>

      <Divider style={styles.divider} />

      <SectionTitle>Bluetooth</SectionTitle>
      <List.Item title={ergStatusTitle(connected, reconnecting, device?.name)} />
      <List.Item
        title={hrStatusTitle(hrConnected, hrReconnecting, hrDevice?.name)}
        description="BLE heart-rate straps (Polar, etc.). Apple Watch is not supported on web."
      />
      <View style={styles.actions}>
        {connected || reconnecting ? (
          <Button mode="outlined" textColor={theme.colors.error} onPress={() => void disconnect()}>
            Disconnect ERG
          </Button>
        ) : null}
        {hrConnected || hrBusy || hrReconnecting ? (
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
        {!hrConnected ? (
          <ConnectButton kind="hr" label={hrReconnecting ? 'Choose HR' : 'Connect HR'} />
        ) : null}
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
  profileHint: {
    marginHorizontal: space.md,
    marginBottom: space.md,
    lineHeight: 20,
  },
  profileFields: {
    marginHorizontal: space.md,
    gap: space.md,
    marginBottom: space.sm,
    alignItems: 'flex-start',
  },
  field: {
    alignSelf: 'stretch',
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
