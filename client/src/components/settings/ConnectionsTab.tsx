import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Button, Icon, Text, useTheme } from 'react-native-paper';
import { ConnectButton } from '@/src/components/ConnectButton';
import { Notice } from '@/src/components/Notice';
import { StravaConnectButton } from '@/src/components/StravaConnectButton';
import { SettingsSection } from '@/src/components/settings/SettingsSection';
import { useStravaStore } from '@/src/store/stravaStore';
import { useWorkoutStore } from '@/src/store/workoutStore';
import { accents, space } from '@/src/theme';

type LinkState = 'connected' | 'reconnecting' | 'connecting' | 'idle';

function linkState(connection: string): LinkState {
  if (connection === 'connected') return 'connected';
  if (connection === 'reconnecting') return 'reconnecting';
  if (connection === 'connecting') return 'connecting';
  return 'idle';
}

function statusIcon(state: LinkState): string {
  if (state === 'connected') return 'bluetooth-connect';
  if (state === 'reconnecting' || state === 'connecting') return 'bluetooth-transfer';
  return 'bluetooth-off';
}

function statusText(state: LinkState): string {
  if (state === 'connected') return 'Connected';
  if (state === 'reconnecting') return 'Reconnecting…';
  if (state === 'connecting') return 'Connecting…';
  return 'Not connected';
}

interface CardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  note?: string;
  action: ReactNode;
}

function ConnectionCard({ icon, title, subtitle, note, action }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness },
      ]}>
      <View style={styles.cardIcon}>{icon}</View>
      <View style={styles.cardText}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {subtitle}
        </Text>
        {note ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {note}
          </Text>
        ) : null}
      </View>
      <View style={styles.cardAction}>{action}</View>
    </View>
  );
}

function DeviceCard({ kind }: { kind: 'erg' | 'hr' }) {
  const theme = useTheme();
  const isHr = kind === 'hr';
  const connection = useWorkoutStore((s) => (isHr ? s.hrConnection : s.connection));
  const device = useWorkoutStore((s) => (isHr ? s.hrDevice : s.device));
  const disconnect = useWorkoutStore((s) => (isHr ? s.disconnectHr : s.disconnect));
  const state = linkState(connection);
  const color =
    state === 'connected'
      ? theme.colors.tertiary
      : state === 'idle'
        ? theme.colors.onSurfaceVariant
        : theme.colors.secondary;

  const subtitle =
    state === 'idle'
      ? 'Not connected'
      : `${statusText(state)}${device?.name ? ` · ${device.name}` : ''}`;

  const action =
    state === 'connected' || state === 'reconnecting' || (isHr && state === 'connecting') ? (
      <Button
        mode="outlined"
        textColor={theme.colors.error}
        onPress={() => void disconnect()}>
        Disconnect
      </Button>
    ) : (
      <ConnectButton kind={kind} label="Connect" />
    );

  return (
    <ConnectionCard
      icon={<Icon source={statusIcon(state)} size={28} color={color} />}
      title={isHr ? 'Heart-rate monitor' : 'Rowing machine (ERG)'}
      subtitle={subtitle}
      note={
        isHr
          ? 'Bluetooth heart-rate straps (Polar, Wahoo, etc.). Apple Watch is not supported on web.'
          : 'Any FTMS-compatible rower or paddle erg.'
      }
      action={
        <View style={styles.actionStack}>
          {action}
          {state === 'reconnecting' ? (
            <ConnectButton kind={kind} label="Choose device" />
          ) : null}
        </View>
      }
    />
  );
}

/** Bluetooth devices and linked apps. */
export function ConnectionsTab() {
  const theme = useTheme();
  const error = useWorkoutStore((s) => s.error);
  const clearError = useWorkoutStore((s) => s.clearError);
  const tokens = useStravaStore((s) => s.tokens);
  const logout = useStravaStore((s) => s.logout);

  return (
    <View>
      <SettingsSection title="Devices">
        <View style={styles.cards}>
          <DeviceCard kind="erg" />
          <DeviceCard kind="hr" />
          {error ? <Notice tone="error" message={error} onDismiss={clearError} /> : null}
        </View>
      </SettingsSection>

      <SettingsSection title="Apps">
        <View style={styles.cards}>
          <ConnectionCard
            icon={<FontAwesome5 name="strava" size={26} color={accents.strava} />}
            title="Strava"
            subtitle={
              tokens
                ? `Connected${tokens.athlete?.firstname ? ` as ${tokens.athlete.firstname}` : ''}`
                : 'Not connected'
            }
            note="Upload finished workouts with notes."
            action={
              tokens ? (
                <Button
                  mode="outlined"
                  textColor={theme.colors.error}
                  onPress={() => void logout()}>
                  Disconnect
                </Button>
              ) : null
            }
          />
          {!tokens ? <StravaConnectButton /> : null}
        </View>
      </SettingsSection>
    </View>
  );
}

const styles = StyleSheet.create({
  cards: {
    marginHorizontal: space.md,
    gap: space.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.md,
    padding: space.lg,
    borderWidth: 1,
  },
  cardIcon: {
    width: 40,
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
    minWidth: 180,
    gap: 2,
  },
  cardAction: {
    flexShrink: 0,
  },
  actionStack: {
    gap: space.sm,
    alignItems: 'flex-end',
  },
});
